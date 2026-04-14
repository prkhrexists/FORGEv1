/**
 * FILE: server/services/sarvam.js
 * PURPOSE: Sarvam API client with retry logic and Gemini failover.
 * DEPENDENCIES: server/services/gemini.js
 * USED BY: routes/resume.js, routes/interview.js
 */

import { callGeminiTextWithRetry } from './gemini.js'

export function callSarvamWithRetry({ apiKey, messages, attempts = 3 }) {
  const run = async () => {
    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sarvam-m',
        messages,
        temperature: 0.3,
      }),
    })

    const json = await response.json()
    if (!response.ok) {
      throw new Error(json?.error?.message || json?.message || `Sarvam request failed (${response.status})`)
    }
    return String(json?.choices?.[0]?.message?.content || '').trim()
  }

  return (async () => {
    let lastError = null
    for (let i = 0; i < attempts; i++) {
      try {
        return await run()
      } catch (err) {
        lastError = err
        if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 700 * (i + 1)))
      }
    }
    throw lastError || new Error('Sarvam failed after retries')
  })()
}

export async function callSarvamOrGemini({ sarvamKey, geminiKey, messages, systemInstruction = 'You are a helpful assistant.' }) {
  try {
    const text = await callSarvamWithRetry({
      apiKey: sarvamKey,
      messages,
      attempts: 3,
    })
    return { text, provider: 'sarvam-m' }
  } catch (sarvamErr) {
    const prompt = messages
      .map((m) => `${String(m?.role || 'user').toUpperCase()}: ${String(m?.content || '')}`)
      .join('\n\n')

    const text = await callGeminiTextWithRetry({
      apiKey: geminiKey,
      prompt,
      systemInstruction,
      attempts: 3,
    })

    return { text, provider: 'gemini-failover' }
  }
}
