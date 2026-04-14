# Architecture

## High-Level Overview

Forge v3 is a **dual-process** application:

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React Frontend (Vite, port 3000)                     │  │
│  │  ┌─────────┐  ┌──────────┐  ┌────────────────────┐   │  │
│  │  │ Three.js │  │  Zustand  │  │    React Flow      │   │  │
│  │  │   3D     │  │  Stores   │  │  (Team Designer)   │   │  │
│  │  │  Scene   │  │ (3 stores)│  │                    │   │  │
│  │  └─────────┘  └──────────┘  └────────────────────┘   │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │ fetch /api/*                          │
│                      ▼                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Express Backend (Node.js, port 8787)                 │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │  │
│  │  │  Routes   │  │ Services │  │     Utils        │    │  │
│  │  │ (6 files) │→ │ (8 files)│  │  (errors, JSON)  │    │  │
│  │  └──────────┘  └────┬─────┘  └──────────────────┘    │  │
│  └──────────────────────┼────────────────────────────────┘  │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │ HTTPS
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Gemini  │   │  Sarvam  │   │  Serper  │
    │   API    │   │   API    │   │   API    │
    └──────────┘   └──────────┘   └──────────┘
```

## Data Flow

### Resume Optimization Flow
1. User uploads PDF → `POST /api/resume/extract` → text extraction via `pdf-parse`
2. User pastes JD → `POST /api/resume/tailor` → Sarvam AI single-pass optimization
3. AI returns strategist analysis + structured resume JSON
4. Frontend renders analysis (ATS score, skill gaps, interview readiness)
5. User requests PDF → `POST /api/resume/render-pdf` → PDFKit generates A4 PDF

### Job Discovery Flow
1. User triggers Nexus-Hunter → `POST /api/jobs/discover`
2. Backend queries Serper.dev with targeted search queries
3. Results filtered through Gemini for alignment scoring
4. Blue Ocean scoring applied (favors direct career pages over LinkedIn)
5. Top 3 prime targets returned to frontend

### Interview Simulation Flow
1. `POST /api/interview/generate` → Sarvam generates 8 Q&A pairs
2. User answers questions in Nexus-Mirror modal
3. `POST /api/interview/cross-question` → recursive cross-questioning with pressure scoring
4. Heuristic fallback engine activates if API unavailable

## Frontend Architecture

### State Management (3 Zustand Stores)

| Store | File | Purpose |
|-------|------|---------|
| `coreStore` | `integration/store/coreStore.ts` | Project state, tasks, logs, career data, resume analysis |
| `teamStore` | `integration/store/teamStore.ts` | Agent team configurations, custom systems |
| `uiStore` | `integration/store/uiStore.ts` | Character UI state, selections, BYOK config |

### 3D Simulation Engine

The simulation layer (`src/simulation/`) manages:
- **SceneManager** — Three.js scene lifecycle, camera, renderer
- **CharacterManager** — GPU-instanced mesh characters with animation system
- **NavMeshManager** — Pathfinding grid for agent movement
- **DriverManager** — Per-agent behavior drivers (NPC AI vs Player input)
- **CharacterStateMachine** — Declarative state → animation mapping

### Component Hierarchy

```
App
├── Header (mode switcher, BYOK, project controls)
├── PhaseOneControlPanel (brief input, reference images)
├── ActionLogPanel (left sidebar — activity feed)
├── SimulationView (3D canvas container)
│   └── UIOverlay (floating UI over 3D scene)
│       ├── AgentStatusPanel
│       └── ChatPanel
├── KanbanPanel (bottom drawer — task board)
├── InspectorPanel (right sidebar — agent inspector)
├── VisualConfigurator (React Flow team designer, modal)
├── ResumeForgeModal
├── NexusHunterModal
├── NexusMirrorModal
├── FinalOutputModal
└── OutputReviewModal
```

## Backend Architecture

### Service Layer

| Service | Purpose |
|---------|---------|
| `gemini.js` | Gemini API client with model failover chain |
| `sarvam.js` | Sarvam API client with retry + Gemini failover |
| `serper.js` | Serper.dev job search client |
| `resumeParser.js` | Resume text → structured sections parser |
| `resumeBuilder.js` | Analysis generation, resume normalization |
| `pdfGenerator.js` | PDFKit-based A4 resume builder |
| `interviewEngine.js` | Cross-questioning heuristics |
| `fallbacks.js` | Deterministic fallback data |

### Error Resilience Pattern

Every API endpoint follows a **try-primary → try-secondary → fallback** pattern:
1. Try Sarvam AI
2. If fails → try Gemini
3. If both fail → use deterministic local fallback

This ensures the app **always returns useful data**, even without API keys.
