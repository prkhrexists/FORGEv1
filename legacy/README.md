# Legacy Python Backend (Archived)

This directory contains the **original Streamlit-based Resume Optimizer** that preceded the current React + Express.js application.

## Status: ARCHIVED — Not used by the active application

The active Forge v3 application runs entirely on:
- **Frontend**: React + TypeScript + Vite (port 3000)
- **Backend**: Express.js API server (port 8787)

## What This Was

A standalone Streamlit app (`main.py`) with a CrewAI-based multi-agent pipeline for resume optimization:
- `main.py` — Streamlit UI entry point
- `logic/crew.py` — Hybrid AI + deterministic fallback orchestration
- `logic/agents.py` — Agent definitions
- `logic/tasks.py` — Task sequence
- `logic/database.py` — SQLite persistence
- `logic/pdf_utils.py` — PDF extraction and generation

## How to Run (Standalone)

```bash
cd legacy
pip install -r requirements.txt
streamlit run main.py
```

## Why It's Archived

The functionality was migrated to the Express.js backend (`server/`) with a React frontend, providing:
- Richer 3D simulation UX
- Multiple career workflows (Resume Forge, Job Hunter, Interview Sim)
- Browser-native PDF generation
- Better error resilience with multi-provider failover
