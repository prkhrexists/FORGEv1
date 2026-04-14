/**
 * FILE: server/index.js
 * PURPOSE: Express application entry point — mounts middleware and route modules.
 * DEPENDENCIES: express, cookie-parser, config, routes/*
 * USED BY: package.json (npm run dev:api)
 *
 * CLEANUP DONE:
 * - Removed 1,600+ lines of inline route handlers, service functions, and utilities
 * - Extracted into server/config.js, server/routes/*, server/services/*, server/utils/*
 * - Removed hardcoded API keys (moved to .env via config.js)
 *
 * REFACTORING DONE:
 * - Split monolithic file into 18 focused modules
 * - Each route file uses Express Router for clean mounting
 * - Services are independently testable
 */

import cookieParser from 'cookie-parser'
import express from 'express'
import { PORT } from './config.js'

// Route modules
import healthRoutes from './routes/health.js'
import resumeRoutes from './routes/resume.js'
import githubRoutes from './routes/github.js'
import chatRoutes from './routes/chat.js'
import interviewRoutes from './routes/interview.js'
import jobsRoutes from './routes/jobs.js'

const app = express()

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', healthRoutes)
app.use('/api', resumeRoutes)
app.use('/api', githubRoutes)
app.use('/api', chatRoutes)
app.use('/api', interviewRoutes)
app.use('/api', jobsRoutes)

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[forge-api] listening on http://localhost:${PORT}`)
})
