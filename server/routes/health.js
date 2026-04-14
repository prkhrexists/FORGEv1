/**
 * FILE: server/routes/health.js
 * PURPOSE: Health check endpoint.
 * DEPENDENCIES: None
 * USED BY: server/index.js
 */

import { Router } from 'express'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ ok: true })
})

export default router
