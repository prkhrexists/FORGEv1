# =============================================================================
# logic/agents.py  -  Persona registry for UI + orchestration
# =============================================================================

AGENTS = {
    "The_Visionary": {
        "name": "The Visionary",
        "role": "Visual Auditor",
        "mission": "Multi-modal layout analysis",
        "ui_status": "The Visionary is scanning layout integrity and recruiter eye-flow...",
    },
    "The_Strategist": {
        "name": "The Strategist",
        "role": "JD Intent Miner",
        "mission": "Find the soul of the job and map skill gaps",
        "ui_status": "The Strategist is decoding the role intent and missing links...",
    },
    "The_Wordsmith": {
        "name": "The Wordsmith",
        "role": "Semantic Optimizer",
        "mission": "Humanized STAR rewrites and outreach copy",
        "ui_status": "The Wordsmith is rewriting bullets for impact and authenticity...",
    },
    "The_Gatekeeper": {
        "name": "The Gatekeeper",
        "role": "ATS Specialist",
        "mission": "Pre-flight parsing compliance check",
        "ui_status": "The Gatekeeper is running ATS pre-flight checks before takeoff...",
    },
}


TASK_SEQUENCE = [
    "The_Strategist",
    "The_Visionary",
    "The_Wordsmith",
    "The_Gatekeeper",
]
