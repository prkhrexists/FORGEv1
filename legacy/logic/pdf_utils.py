# =============================================================================
# logic/pdf_utils.py  –  PDF extraction + PDF generation utilities
# =============================================================================
# Zero Streamlit imports here — this is pure logic.
# =============================================================================

import os
import io
import time
import requests
import pdfplumber


def _sanitize_pdf_text(text: str) -> str:
    """
    Keep text compatible with core FPDF fonts (latin-1) by normalizing
    common Unicode punctuation and dropping unsupported glyphs.
    """
    replacements = {
        "\u2022": "-",  # bullet
        "\uf0b7": "-",  # private-use bullet from copied docs
        "\u2013": "-",  # en dash
        "\u2014": "-",  # em dash
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u00a0": " ",
    }
    normalized = text
    for src, dst in replacements.items():
        normalized = normalized.replace(src, dst)
    return normalized.encode("latin-1", errors="ignore").decode("latin-1")


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extracts text from PDF file bytes.

    Args:
        pdf_bytes: Raw bytes of the uploaded PDF file.

    Returns:
        str: Combined text from all pages, or empty string on failure.
    """
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception:
        pass
    return text.strip()


def generate_pdf_pdfmonkey(markdown_content: str) -> bytes | None:
    """
    Sends markdown to PDFMonkey for PDF generation.
    Returns PDF bytes, or None if unavailable / failed.
    """
    api_key = os.getenv("PDFMONKEY_API_KEY", "")
    template_id = os.getenv("PDFMONKEY_TEMPLATE_ID", "")

    if not api_key or not template_id or "dummy" in template_id.lower():
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "document": {
            "document_template_id": template_id,
            "payload": {"resume_content": markdown_content},
            "status": "pending",
        }
    }

    try:
        resp = requests.post(
            "https://api.pdfmonkey.io/api/v1/documents",
            headers=headers, json=payload, timeout=30,
        )
        resp.raise_for_status()
        doc_id = resp.json().get("document", {}).get("id")
        if not doc_id:
            return None

        for _ in range(12):
            time.sleep(5)
            status_resp = requests.get(
                f"https://api.pdfmonkey.io/api/v1/documents/{doc_id}",
                headers=headers, timeout=15,
            )
            status_resp.raise_for_status()
            doc = status_resp.json().get("document", {})
            if doc.get("status") == "success" and doc.get("download_url"):
                return requests.get(doc["download_url"], timeout=30).content
            if doc.get("status") == "failure":
                return None
        return None
    except Exception:
        return None


def generate_pdf_local(markdown_content: str) -> bytes:
    """
    Generates a PDF locally using fpdf2 (no external API needed).
    """
    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font("Helvetica", size=10)

    for line in markdown_content.split("\n"):
        s = line.strip()
        if s.startswith("# "):
            pdf.set_font("Helvetica", style="B", size=16)
            pdf.cell(0, 10, s[2:].strip(), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)
        elif s.startswith("## "):
            pdf.set_font("Helvetica", style="B", size=13)
            pdf.cell(0, 8, s[3:].strip(), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)
        elif s.startswith("### "):
            pdf.set_font("Helvetica", style="B", size=11)
            pdf.cell(0, 7, s[4:].strip(), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)
        elif s.startswith("- ") or s.startswith("* "):
            pdf.set_font("Helvetica", size=10)
            pdf.cell(5)
            bullet_text = _sanitize_pdf_text(s[2:].strip().replace("**", ""))
            pdf.multi_cell(0, 5, f"-  {bullet_text}")
            pdf.ln(1)
        elif s.startswith("---"):
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(3)
        elif s == "":
            pdf.ln(3)
        else:
            pdf.set_font("Helvetica", size=10)
            safe_text = _sanitize_pdf_text(s.replace("**", ""))
            pdf.multi_cell(0, 5, safe_text)
            pdf.ln(1)

    raw = pdf.output()
    if isinstance(raw, bytearray):
        return bytes(raw)
    if isinstance(raw, bytes):
        return raw
    if isinstance(raw, str):
        return raw.encode("latin-1", errors="ignore")
    return bytes(raw)
