/**
 * FILE: server/utils/errors.js
 * PURPOSE: Error classification, normalization, and friendly user-facing messages.
 * DEPENDENCIES: None
 * USED BY: routes/*, services/*
 */

export function isTransientModelError(err) {
  const msg = String(err?.message || '').toLowerCase()
  return (
    msg.includes('high demand') ||
    msg.includes('try again later') ||
    msg.includes('resource exhausted') ||
    msg.includes('quota') ||
    msg.includes('temporar') ||
    msg.includes('503') ||
    msg.includes('429')
  )
}

export function toFriendlyModelWarning(err, provider = 'Primary AI service') {
  const msg = String(err?.message || '').toLowerCase()
  if (msg.includes('api key') || msg.includes('permission denied') || msg.includes('forbidden')) {
    return `${provider} key is not authorized for server-side calls. Check key restrictions or billing, then retry.`
  }
  if (msg.includes('quota') || msg.includes('rate') || msg.includes('limit') || msg.includes('resource exhausted')) {
    return `${provider} is rate-limited. Fallback generation was used.`
  }
  if (msg.includes('high demand') || msg.includes('try again later') || msg.includes('503') || msg.includes('429')) {
    return `${provider} is under high demand. Fallback generation was used.`
  }
  return `${provider} was unavailable. Fallback generation was used.`
}

export function normalizeSarvamError(err) {
  const msg = String(err?.message || '')
  const low = msg.toLowerCase()
  if (low.includes('rate') || low.includes('quota') || low.includes('resource exhausted') || low.includes('429')) {
    return 'Sarvam API temporarily rate-limited'
  }
  if (low.includes('unauthorized') || low.includes('forbidden') || low.includes('invalid api key') || low.includes('401') || low.includes('403')) {
    return 'Sarvam API key invalid or unauthorized'
  }
  if (low.includes('timed out') || low.includes('timeout') || low.includes('503') || low.includes('502')) {
    return 'Sarvam API temporary outage'
  }
  return 'Sarvam API unavailable'
}

export function requireEnv(name, value, res) {
  if (!value) {
    res.status(500).json({ error: `Missing server environment variable: ${name}` })
    return false
  }
  return true
}
