# Backend API Reference

Base URL: `http://localhost:8787/api`

## Endpoints

### Health

#### `GET /api/health`
Returns server status.

**Response:**
```json
{ "ok": true }
```

---

### Resume

#### `POST /api/resume/extract`
Extract text from an uploaded PDF resume.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resumePdf` | File | Yes | PDF file to extract text from |

**Response:**
```json
{
  "fileName": "resume.pdf",
  "pages": 2,
  "text": "Extracted resume text..."
}
```

---

#### `POST /api/resume/bullet`
Generate a resume bullet point from GitHub repository data.

**Body:**
```json
{
  "repoData": {
    "repository": "my-project",
    "commits": 42
  },
  "keys": {
    "gemini": "optional-override-key"
  }
}
```

**Response:**
```json
{
  "bullet": "Engineered core services with 42+ commit contributions...",
  "fallback": false
}
```

---

#### `POST /api/resume/tailor`
Full resume optimization pipeline — strategist analysis + structured resume.

**Body:**
```json
{
  "resume": "Raw resume text...",
  "jd": "Job description text...",
  "keys": {
    "sarvam": "api-key",
    "structurer": "optional"
  }
}
```

**Response:**
```json
{
  "tailoredResume": "Formatted plain-text resume",
  "structuredResume": { "header": {}, "summary": "", "skills": {}, "experience": [], ... },
  "analysis": {
    "atsCompatibility": 85,
    "skillGaps": [{ "skill": "Kubernetes", "status": "gap" }],
    "interviewReadiness": { "technicalDeepDive": 90, "behavioralQuestions": 74, "systemDesign": 87 }
  },
  "modelUsed": "sarvam-m-single-pass",
  "warning": ""
}
```

---

#### `POST /api/resume/render-pdf`
Generate a professional PDF from structured resume data.

**Body:**
```json
{
  "structuredResume": { ... },
  "resume": "fallback text if no structured data",
  "jd": "job description for context",
  "keys": { "sarvam": "", "gemini": "", "structurer": "" }
}
```

**Response:** Binary PDF file (`application/pdf`)

---

### GitHub

#### `GET /api/github/oauth/start`
Initiates GitHub OAuth flow. Redirects to GitHub authorization page.

#### `GET /api/github/oauth/callback`
OAuth callback handler. Exchanges code for access token and redirects to app.

#### `GET /api/github/repos`
Fetch user's recent repositories with commit/PR statistics.

**Headers:** `Authorization: Bearer <github_token>`

**Response:**
```json
{
  "repos": [
    {
      "id": "123",
      "name": "my-project",
      "url": "https://github.com/user/my-project",
      "commits": 30,
      "pullRequests": 5,
      "primaryLanguage": "TypeScript",
      "linesEstimate": 5400,
      "latestSummary": "feat: add new feature"
    }
  ]
}
```

---

### Chat

#### `POST /api/chat/director`
Chat with Nexus-Director for resume guidance.

**Body:**
```json
{
  "message": "How should I improve my summary?",
  "context": "Resume and JD context...",
  "history": [{ "role": "user", "content": "..." }],
  "key": "optional-gemini-key"
}
```

**Response:**
```json
{
  "reply": "Focus your summary on the top 3 JD requirements...",
  "fallback": false
}
```

---

### Interview

#### `POST /api/interview/generate`
Generate interview Q&A pairs from resume and JD.

**Body:**
```json
{
  "resume": "Resume text...",
  "jd": "Job description...",
  "key": "sarvam-api-key"
}
```

**Response:**
```json
{
  "items": [
    {
      "id": "nmx_123_0",
      "question": "How would you design...",
      "answer": "I would start by...",
      "category": "technical"
    }
  ]
}
```

---

#### `POST /api/interview/cross-question`
Recursive cross-questioning on a user's interview answer.

**Body:**
```json
{
  "question": "Original question...",
  "answer": "User's answer...",
  "category": "technical",
  "key": "sarvam-api-key"
}
```

**Response:**
```json
{
  "phaseA": {
    "detectedType": "technical-claim",
    "technicalClaim": "built a cache layer",
    "logicGap": "",
    "thinOrNonTechnical": false,
    "reason": "Answer has technical detail..."
  },
  "phaseB": {
    "followUpQuestion": "You said you built a cache layer..."
  },
  "pressureDelta": 7,
  "mode": "sarvam"
}
```

---

### Jobs

#### `POST /api/jobs/discover`
Nexus-Hunter job discovery — searches and ranks job opportunities.

**Body:**
```json
{
  "resume": "Resume text...",
  "targetRole": "AI Engineer",
  "key": "gemini-api-key",
  "serperKey": "serper-api-key"
}
```

**Response:**
```json
{
  "items": [
    {
      "job_title": "Founding AI Engineer",
      "company_name": "YC Startup",
      "application_link": "https://...",
      "nexus_match_reason": "Direct fit for...",
      "alignment_score": 91,
      "blue_ocean_score": 89,
      "source": "company-careers",
      "competition_level": "Low"
    }
  ],
  "mode": "gemini-serper"
}
```

---

## Error Handling

All endpoints follow a consistent error pattern:

- `400` — Missing required parameters
- `401` — Missing authentication token
- `422` — Input could not be processed (e.g., unreadable PDF)
- `500` — Server/service error

Every AI-powered endpoint includes a `fallback` field indicating whether deterministic fallback was used, and a `warning` field with a human-readable explanation if so.
