# Forge v3

Forge v3 is a 3D career orchestration platform that combines immersive simulation UX with practical job-search execution through a **Nexus Agent Network**.

## Features

- **Resume Forge** — Upload resume + paste JD → AI-optimized tailored resume with structured PDF output
- **Nexus-Hunter** — Blue ocean job discovery using Serper + Gemini ranking
- **Nexus-Mirror** — Deep interview simulator with recursive cross-questioning
- **3D Simulation Workspace** — Live agent visualization with Three.js characters and pathfinding
- **Visual Team Designer** — React Flow-based node editor for configuring agent roles
- **Career Intel Panel** — ATS compatibility, skill gap analysis, interview readiness metrics
- **Application Pipeline** — Kanban-style job tracking board

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS v4 |
| 3D Engine | Three.js, three-pathfinding |
| State | Zustand |
| UI Components | Lucide React, React Flow, React Markdown |
| Backend API | Express.js (Node.js) |
| AI Providers | Gemini (Google), Sarvam AI |
| Job Search | Serper.dev |
| PDF | PDFKit (server), jspdf (client) |
| Auth | GitHub OAuth |
| CI/CD | GitHub Actions (Pages deploy + releases) |

## Directory Structure

```
forge-final/
├── server/                  # Express.js backend API
│   ├── index.js             # Entry point (lean: middleware + route mounting)
│   ├── config.js            # Environment variables and constants
│   ├── middleware/           # Express middleware (multer upload)
│   ├── routes/              # API route handlers
│   │   ├── health.js        # GET /api/health
│   │   ├── resume.js        # POST /api/resume/*
│   │   ├── github.js        # GET /api/github/*
│   │   ├── chat.js          # POST /api/chat/director
│   │   ├── interview.js     # POST /api/interview/*
│   │   └── jobs.js          # POST /api/jobs/discover
│   ├── services/            # Business logic (AI clients, parsers, generators)
│   └── utils/               # Shared utilities (errors, helpers)
├── src/                     # React frontend
│   ├── core/                # Agent brain, LLM integration, tools
│   ├── data/                # Agent definitions
│   ├── integration/         # Hooks and Zustand stores
│   ├── interface/           # UI panels, modals, components
│   ├── simulation/          # 3D engine (scene, characters, pathfinding)
│   └── theme/               # Brand colors
├── public/                  # Static assets (models, images, vendor libs)
├── legacy/                  # Archived Streamlit Python backend
├── docs/                    # Documentation
├── releases/                # Release notes
└── .github/workflows/       # CI/CD (deploy + release)
```

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Copy environment template and fill in your API keys
cp .env.example .env
```

### Run

```bash
# Start both frontend (port 3000) and backend API (port 8787)
npm run dev
```

This runs:
- `npm run dev:web` — Vite dev server at http://localhost:3000
- `npm run dev:api` — Express API at http://localhost:8787

### Build

```bash
npm run build
```

### Type Check

```bash
npm run lint
```

## Environment Variables

See [.env.example](.env.example) for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `SARVAM_API_KEY` | Yes | Sarvam AI API key |
| `GITHUB_CLIENT_ID` | No | For GitHub OAuth integration |
| `SERPER_API_KEY` | No | For Nexus-Hunter job search |

## Deployment

Production builds deploy to GitHub Pages with base path `/forgev3/`:

- Dev: `base = '/'`
- Prod: `base = '/forgev3/'`

## License

MIT — see [LICENSE](LICENSE).

## Maintainer

- [prkhrexists](https://github.com/prkhrexists)
