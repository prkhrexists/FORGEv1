/**
 * FILE: server/services/gemini.js
 * PURPOSE: Gemini API client with model failover and retry logic.
 * DEPENDENCIES: server/config.js
 * USED BY: routes/resume.js, routes/chat.js, routes/jobs.js
 */

import { GEMINI_MODELS } from '../config.js'

export async function callGeminiText({ apiKey, prompt, systemInstruction, modelCandidates = GEMINI_MODELS }) {
  let lastError = null

  for (const model of modelCandidates) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        const msg = json?.error?.message || `Gemini request failed (${response.status})`
        lastError = new Error(`[${model}] ${msg}`)
        continue
      }

      const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join(' ').trim() || ''
      if (text) return text

      lastError = new Error(`[${model}] Empty completion from Gemini.`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error('Gemini request failed for all configured models.')
}

export async function callGeminiTextWithRetry({ apiKey, prompt, systemInstruction, attempts = 3 }) {
  let lastError = null
  for (let i = 0; i < attempts; i++) {
    try {
      return await callGeminiText({ apiKey, prompt, systemInstruction })
    } catch (err) {
      lastError = err
      if (i < attempts - 1) {
        const waitMs = 700 * (i + 1)
        await new Promise((resolve) => setTimeout(resolve, waitMs))
      }
    }
  }
  throw lastError || new Error('Gemini request failed after retries')
}
