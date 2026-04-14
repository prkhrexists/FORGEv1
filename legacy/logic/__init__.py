# =============================================================================
# logic/__init__.py  -  Public API for the logic package
# =============================================================================
# main.py should ONLY import from here. This keeps the interface clean.
# =============================================================================

from logic.crew import run_crew
from logic.pdf_utils import extract_text_from_pdf, generate_pdf_pdfmonkey, generate_pdf_local
from logic.database import save_optimization, update_outcome, get_winning_phrases

__all__ = [
    "run_crew",
    "extract_text_from_pdf",
    "generate_pdf_pdfmonkey",
    "generate_pdf_local",
    "save_optimization",
    "update_outcome",
    "get_winning_phrases",
]
