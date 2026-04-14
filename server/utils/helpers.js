/**
 * FILE: server/utils/helpers.js
 * PURPOSE: Pure utility functions with no external dependencies.
 * DEPENDENCIES: None
 * USED BY: services/*, routes/*
 */

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

export function tryParseJsonLoose(input) {
  const text = String(input || '').trim()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    const objMatch = text.match(/\{[\s\S]*\}/)
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0])
      } catch {
        return null
      }
    }
    return null
  }
}

export function inferJobMetaFromLink(link) {
  const l = String(link || '').toLowerCase()
  const isLinkedIn = l.includes('linkedin.com')
  const isDirectCareers = l.includes('greenhouse.io') || l.includes('lever.co') || l.includes('workatastartup.com') || l.includes('/careers')
  return {
    source: isLinkedIn ? 'linkedin' : isDirectCareers ? 'company-careers' : 'hidden',
    competitionLevel: isLinkedIn ? 'High' : isDirectCareers ? 'Low' : 'Medium',
    blueOceanBoost: isLinkedIn ? -12 : isDirectCareers ? 12 : 4,
  }
}
