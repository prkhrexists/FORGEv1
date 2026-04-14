/**
 * FILE: server/routes/chat.js
 * PURPOSE: Nexus-Director chat endpoint.
 * DEPENDENCIES: services/gemini, config
 * USED BY: server/index.js
 */

import { Router } from 'express'
import { GEMINI_API_KEY } from '../config.js'
import { callGeminiTextWithRetry } from '../services/gemini.js'
import { toFriendlyModelWarning } from '../utils/errors.js'

const router = Router()

router.post('/chat/director', async (req, res) => {
  const message = String(req.body?.message || '').trim()
  const context = String(req.body?.context || '').trim()
  const history = Array.isArray(req.body?.history) ? req.body.history : []
  const apiKey = String(req.body?.key || GEMINI_API_KEY).trim()

  if (!message) {
    res.status(400).json({ error: 'Message is required.' })
    return
  }

  try {
    const compactHistory = history
      .slice(-8)
      .map((m) => {
        const role = String(m?.role || 'user').toLowerCase() === 'assistant' ? 'Director' : 'User'
        const content = String(m?.content || '').trim()
        return content ? `${role}: ${content}` : ''
      })
      .filter(Boolean)
      .join('\n')

    const reply = await callGeminiTextWithRetry({
      apiKey,
      prompt: `Context:\n${context}\n\nRecent chat:\n${compactHistory || 'None'}\n\nUser message:\n${message}`,
      systemInstruction: 'You are Nexus-Director helping tailor resumes to JDs. Give practical, specific guidance in 4-8 lines. Use direct language and suggest next actions.',
      attempts: 4,
    })

    res.json({ reply: reply || 'I recommend focusing your top 3 bullets on measurable outcomes directly aligned to the job description.' })
  } catch (err) {
    res.json({
      reply: 'Nexus-Director fallback: Prioritize JD keywords, quantify achievements, and move strongest role-aligned bullets to the top section.',
      fallback: true,
      warning: toFriendlyModelWarning(err),
    })
  }
})

export default router
