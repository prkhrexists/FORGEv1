import hashlib
import json
import os
import sys
#hehe
import plotly.graph_objects as go
import streamlit as st
from dotenv import load_dotenv

load_dotenv(override=True)

sys.path.insert(0, os.path.dirname(__file__))

from logic import extract_text_from_pdf, generate_pdf_local, generate_pdf_pdfmonkey, run_crew, save_optimization, update_outcome, get_winning_phrases


def _hash_inputs(resume_text: str, jd_text: str) -> str:
    return hashlib.sha256(f"{resume_text}\n\n{jd_text}".encode("utf-8")).hexdigest()


def _init_state() -> None:
    defaults = {
        "resume_hash": "",
        "resume_text": "",
        "jd_text": "",
        "final_result": None,
        "result_json": None,
        "pdf_bytes": None,
        "input_hash": "",
        "feed": [],
        "logic_logs": [],
        "power_level": 0,
        "match_rate": 0,
        "professionalism_score": 0,
        "pending_review": False,
        "review_variant_index": 0,
        "selected_variant": None,
        "success_outcome": "pending",
        "last_db_id": None,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def _append_feed(message: str) -> None:
    st.session_state.feed.append(message)


def _agent_callback(agent_key: str, ui_status: str) -> None:
    _append_feed(ui_status)
    st.session_state.power_level = min(100, st.session_state.power_level + 25)
    st.session_state.match_rate = min(100, st.session_state.match_rate + 22)


def _variants(base_resume: str) -> list[str]:
    return [
        base_resume,
        base_resume + "\n\n### Notes\n- Emphasized execution velocity and ownership.",
        base_resume + "\n\n### Notes\n- Emphasized collaboration, reliability, and delivery quality.",
    ]


def _render_skill_radar(result: dict) -> None:
    gap = result.get("Skill Gap List", {})
    jd_keywords = gap.get("jd_keywords", [])[:6]
    missing = set(gap.get("missing_links", []))
    if not jd_keywords:
        st.info("Not enough skill data to render radar chart.")
        return

    user_scores = [2 if k in missing else 8 for k in jd_keywords]
    jd_scores = [10 for _ in jd_keywords]

    fig = go.Figure()
    fig.add_trace(
        go.Scatterpolar(r=user_scores, theta=jd_keywords, fill="toself", name="User Skills")
    )
    fig.add_trace(
        go.Scatterpolar(r=jd_scores, theta=jd_keywords, fill="toself", name="JD Requirements")
    )
    fig.update_layout(polar=dict(radialaxis=dict(visible=True, range=[0, 10])), showlegend=True)
    st.plotly_chart(fig, use_container_width=True)


def _run_pipeline(resume_text: str, jd_text: str) -> None:
    st.session_state.feed = []
    st.session_state.logic_logs = []
    st.session_state.power_level = 5
    st.session_state.match_rate = 8

    raw = run_crew(resume_text=resume_text, jd_text=jd_text, task_callback=_agent_callback)
    parsed = json.loads(raw)

    st.session_state.result_json = parsed
    st.session_state.final_result = parsed.get("Optimized Resume Text", "")
    st.session_state.logic_logs = parsed.get("Agent Logic Logs for the UI", [])
    st.session_state.professionalism_score = parsed.get("Meta", {}).get("professionalism_score", 0)

    # Persistence: Save optimization to DB
    st.session_state.last_db_id = save_optimization(
        resume_hash=st.session_state.resume_hash,
        input_resume=resume_text,
        input_jd=jd_text,
        optimized_text=st.session_state.final_result,
        full_json=parsed,
        outcome=st.session_state.success_outcome
    )

    pdf_out = generate_pdf_pdfmonkey(st.session_state.final_result)
    if pdf_out is None:
        pdf_out = generate_pdf_local(st.session_state.final_result)
    st.session_state.pdf_bytes = pdf_out

    st.session_state.power_level = 100
    st.session_state.match_rate = 100
    st.session_state.pending_review = True


def main() -> None:
    st.set_page_config(page_title="Career-Tech Orchestrator", page_icon="AI", layout="wide")
    _init_state()

    st.title("Career-Tech Orchestration System")
    st.caption("Multi-agent resume optimization with live collaboration, logic transparency, and HITL checkpoints.")

    with st.sidebar:
        st.header("Controls")
        st.text_input("Gemini API Key (optional)", type="password", key="sidebar_gemini")
        st.text_input("Sarvam API Key (optional)", type="password", key="sidebar_sarvam")
        st.caption("If API providers fail, deterministic local fallback will still deliver full output.")

        st.subheader("Success Loop")
        def _update_db_outcome():
            if st.session_state.get("last_db_id"):
                update_outcome(st.session_state.last_db_id, st.session_state.outcome_box)

        st.session_state.success_outcome = st.selectbox(
            "Outcome tag",
            ["pending", "Rejected", "Interview", "Offer"],
            index=0,
            key="outcome_box",
            on_change=_update_db_outcome,
        )

        winning = get_winning_phrases(limit=3)
        if winning:
            with st.expander("Recent Winning Phrases"):
                for w in winning:
                    st.caption(f"• {w}")

    if st.session_state.get("sidebar_gemini"):
        os.environ["GEMINI_API_KEY"] = st.session_state["sidebar_gemini"]
    if st.session_state.get("sidebar_sarvam"):
        os.environ["SARVAM_API_KEY"] = st.session_state["sidebar_sarvam"]

    c1, c2 = st.columns(2)
    with c1:
        uploaded = st.file_uploader("Upload Resume PDF", type=["pdf"])
    with c2:
        jd_input = st.text_area("Paste Job Description", height=220)

    if uploaded is not None:
        raw_bytes = uploaded.read()
        extracted = extract_text_from_pdf(raw_bytes)
        if extracted:
            st.session_state.resume_text = extracted
            st.session_state.resume_hash = hashlib.sha256(raw_bytes).hexdigest()
            with st.expander("Extracted Resume Preview"):
                st.text(extracted[:1200])
        else:
            st.error("Could not extract text from PDF.")

    st.subheader("Resume Power Levels")
    p1, p2, p3 = st.columns(3)
    with p1:
        st.metric("Power Level", f"{st.session_state.power_level}%")
        st.progress(st.session_state.power_level / 100)
    with p2:
        st.metric("Match-Rate Meter", f"{st.session_state.match_rate}%")
        st.progress(st.session_state.match_rate / 100)
    with p3:
        st.metric("Professionalism Score", f"{st.session_state.professionalism_score}%")
        st.progress(min(100, st.session_state.professionalism_score) / 100)

    run_clicked = st.button("Launch Multi-Agent Optimization", type="primary", use_container_width=True)
    current_hash = _hash_inputs(st.session_state.resume_text, jd_input)

    if run_clicked:
        if not st.session_state.resume_text:
            st.error("Upload a resume PDF first.")
            st.stop()
        if not jd_input.strip():
            st.error("Paste a job description first.")
            st.stop()

        if current_hash == st.session_state.input_hash and st.session_state.result_json is not None:
            _append_feed("Using cached orchestration result (inputs unchanged).")
        else:
            _run_pipeline(st.session_state.resume_text, jd_input)
            st.session_state.jd_text = jd_input
            st.session_state.input_hash = current_hash

    st.subheader("Live Collaboration Feed")
    if st.session_state.feed:
        for item in st.session_state.feed:
            st.write(f"- {item}")
    else:
        st.info("Agent feed will stream here during execution.")

    if st.session_state.result_json:
        st.subheader("Human-in-the-Loop Checkpoint")
        variants = _variants(st.session_state.final_result)
        selected = st.radio(
            "Does this reflect your true experience?",
            ["Accept", "Tweak", "Regenerate"],
            horizontal=True,
        )

        if selected == "Tweak":
            idx = st.selectbox("Choose one of 3 variations", [0, 1, 2], format_func=lambda x: f"Variation {x + 1}")
            st.session_state.selected_variant = variants[idx]
            st.code(variants[idx], language="markdown")
        elif selected == "Regenerate":
            st.session_state.selected_variant = variants[2]
            st.code(variants[2], language="markdown")
        else:
            st.session_state.selected_variant = variants[0]

        st.subheader("Agent Interaction Logs")
        for i, log in enumerate(st.session_state.logic_logs):
            with st.expander(f"Info {i + 1}: {log.get('agent', 'Agent')}"):
                st.write(log.get("logic", ""))

        st.subheader("Skill Gap Visualization")
        _render_skill_radar(st.session_state.result_json)

        st.subheader("Optimized Resume")
        st.markdown(st.session_state.selected_variant or st.session_state.final_result)

        output_json = dict(st.session_state.result_json)
        output_json.setdefault("Meta", {})["success_loop_tag"] = st.session_state.success_outcome

        st.subheader("Structured JSON Output")
        st.code(json.dumps(output_json, ensure_ascii=True, indent=2), language="json")

        used_fallback = output_json.get("Meta", {}).get("used_fallback", True)
        provider = output_json.get("Meta", {}).get("provider", "unknown")
        if used_fallback:
            st.warning(f"Provider used: {provider}. LLM API was unavailable/invalid, so fallback logic was used.")
        else:
            st.success(f"Live API output used via provider: {provider}.")

        if st.session_state.pdf_bytes:
            st.download_button(
                "Download Optimized Resume PDF",
                data=st.session_state.pdf_bytes,
                file_name="optimized_resume.pdf",
                mime="application/pdf",
                use_container_width=True,
            )


if __name__ == "__main__":
    main()
