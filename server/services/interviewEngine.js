/**
 * FILE: server/services/interviewEngine.js
 * PURPOSE: Interview cross-questioning heuristics and answer classification.
 * DEPENDENCIES: server/utils/helpers.js
 * USED BY: routes/interview.js
 */

import { clamp } from '../utils/helpers.js'

export function buildMirrorFallbackCrossQuestion({ question, userAnswer, category }) {
  const answer = String(userAnswer || '').trim()
  const words = answer.split(/\s+/).filter(Boolean)
  const lower = answer.toLowerCase()
  const technicalMarkers = [
    'api', 'latency', 'cache', 'queue', 'pipeline', 'database', 'kafka', 'redis', 'rag',
    'embedding', 'vector', 'aws', 'gcp', 'azure', 'kubernetes', 'docker', 'ci/cd', 'ci', 'cd',
    'microservice', 'observability', 'slo', 'slas', 'throughput', 'retry', 'idempotent',
  ]
  const hasTechnicalSignal = technicalMarkers.some((m) => lower.includes(m))
  const hasNumbers = /\d/.test(answer)
  const thinOrNonTechnical = words.length < 18 || !hasTechnicalSignal

  const claimMatch = answer.match(/\b(i|we)\s+(used|built|designed|implemented|migrated|optimized|deployed)\b[^.?!]*/i)
  const technicalClaim = claimMatch
    ? claimMatch[0].replace(/^\b(i|we)\s+/i, '').trim()
    : hasTechnicalSignal
      ? words.slice(0, Math.min(14, words.length)).join(' ')
      : ''

  const logicGap = technicalClaim
    ? (hasNumbers ? '' : 'No concrete metric, trade-off, or measurable outcome was provided.')
    : 'Answer is vague and does not anchor on a concrete architecture, implementation choice, or incident.'

  const focus = technicalClaim || logicGap
  const defaultByCategory = category === 'behavioral'
    ? 'What specific decision did you own, what alternatives did you reject, and what was the measurable impact?'
    : category === 'system-design'
      ? 'Walk me through the bottleneck, failure mode, and the exact trade-off you made under load.'
      : 'Explain the architecture details, trade-offs, and failure handling for that implementation.'

  const followUpQuestion = technicalClaim
    ? `You said you ${technicalClaim}. What were the key trade-offs, how did you validate performance, and what failed first in production?`
    : `${focus} ${defaultByCategory}`

  const pressureDelta = thinOrNonTechnical ? 18 : 7

  return {
    phaseA: {
      detectedType: technicalClaim ? 'technical-claim' : 'logic-gap',
      technicalClaim,
      logicGap,
      thinOrNonTechnical,
      reason: thinOrNonTechnical
        ? 'Answer is short or missing technical depth; pressure should increase.'
        : 'Answer has technical detail but still needs deeper validation.',
    },
    phaseB: {
      followUpQuestion,
    },
    pressureDelta,
    mode: 'fallback-heuristic',
  }
}

export function classifyInterviewAnswerHeuristic(answer) {
  const text = String(answer || '').trim()
  const words = text.split(/\s+/).filter(Boolean)
  const low = text.toLowerCase()
  const technicalTerms = [
    'api', 'latency', 'cache', 'caching', 'queue', 'kafka', 'redis', 'postgres', 'mysql', 'mongodb',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'ci/cd', 'pipeline', 'microservice', 'graphql',
    'rag', 'embedding', 'vector', 'index', 'retrieval', 'llm', 'token', 'throughput', 'observability',
    'slo', 'sla', 'idempotent', 'retry', 'circuit breaker', 'sharding', 'partition',
  ]
  const claimIndicators = ['i built', 'i designed', 'i implemented', 'i used', 'i optimized', 'i migrated', 'i led', 'i created']

  const detectedTerms = technicalTerms.filter((t) => low.includes(t))
  const claimIndicator = claimIndicators.find((c) => low.includes(c))

  const claimMatch = text.match(/\b(?:used|implemented|designed|built|optimized|migrated|created)\s+([^,.]{3,80})/i)
  const claim = claimMatch?.[1]?.trim() || (detectedTerms[0] ? `used ${detectedTerms[0]}` : '')

  const thin = words.length < 18 || detectedTerms.length === 0
  const technicalDepth = clamp(Math.round((detectedTerms.length * 12) + Math.min(words.length, 50) * 1.2), 8, 92)

  if (claimIndicator && claim) {
    return {
      classification: 'claim',
      target: claim,
      rationale: 'Answer includes a direct implementation claim that can be stress-tested.',
      thin,
      technicalDepth,
      detectedTerms,
    }
  }

  return {
    classification: 'logic-gap',
    target: detectedTerms[0] || 'execution details',
    rationale: 'Answer is high-level or vague. Missing concrete architecture, trade-offs, or metrics.',
    thin: true,
    technicalDepth: clamp(technicalDepth - 12, 5, 70),
    detectedTerms,
  }
}

export function buildFallbackFollowUp({ question, scan }) {
  if (scan.classification === 'claim') {
    return `You said you ${scan.target}. Walk me through the exact architecture, the key trade-off you made, and one production metric you improved.`
  }
  return `Your answer was high-level. For "${question}", give a concrete implementation: components used, failure mode handled, and measurable impact.`
}
