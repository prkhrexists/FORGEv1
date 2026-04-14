/**
 * FILE: server/routes/interview.js
 * PURPOSE: Interview question generation and cross-questioning endpoints.
 * DEPENDENCIES: services/sarvam, services/interviewEngine, config
 * USED BY: server/index.js
 */

import { Router } from 'express'
import { DEFAULT_SARVAM_KEY } from '../config.js'
import { callSarvamWithRetry } from '../services/sarvam.js'
import { buildMirrorFallbackCrossQuestion } from '../services/interviewEngine.js'
import { normalizeSarvamError } from '../utils/errors.js'
import { tryParseJsonLoose } from '../utils/helpers.js'

const router = Router()

router.post('/interview/generate', async (req, res) => {
  const resume = String(req.body?.resume || '').trim()
  const jd = String(req.body?.jd || '').trim()
  const key = String(req.body?.key || DEFAULT_SARVAM_KEY).trim()

  if (!resume || !jd) {
    res.status(400).json({ error: 'Resume and JD are required for interview generation.' })
    return
  }

  const prompt = [
    'Generate 8 interview question-answer pairs tailored to the candidate resume and job description.',
    'Output strict JSON array with objects:',
    '{ "question": string, "answer": string, "category": "technical"|"behavioral"|"system-design" }',
    `JOB DESCRIPTION:\n${jd}`,
    `RESUME:\n${resume}`,
  ].join('\n\n')

  try {
    const sarvamRes = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'sarvam-m',
        messages: [
          { role: 'system', content: 'You are Nexus-Mirror. Return strict JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
      }),
    })

    const sarvamJson = await sarvamRes.json()
    if (!sarvamRes.ok) {
      throw new Error(sarvamJson?.error?.message || sarvamJson?.message || 'Sarvam request failed')
    }

    const content = String(sarvamJson?.choices?.[0]?.message?.content || '').trim()
    let parsed = []
    try {
      parsed = JSON.parse(content)
    } catch {
      const match = content.match(/\[[\s\S]*\]/)
      parsed = match ? JSON.parse(match[0]) : []
    }

    const items = (Array.isArray(parsed) ? parsed : [])
      .slice(0, 8)
      .map((item, idx) => ({
        id: `nmx_${Date.now()}_${idx}`,
        question: String(item?.question || '').trim(),
        answer: String(item?.answer || '').trim(),
        category: ['technical', 'behavioral', 'system-design'].includes(String(item?.category || '').toLowerCase())
          ? String(item.category).toLowerCase()
          : (idx % 3 === 0 ? 'technical' : idx % 3 === 1 ? 'behavioral' : 'system-design'),
      }))
      .filter((x) => x.question && x.answer)

    if (items.length === 0) {
      throw new Error('Sarvam returned empty interview set')
    }

    res.json({ items })
  } catch (err) {
    const fallback = [
      {
        id: `nmx_${Date.now()}_1`,
        category: 'technical',
        question: 'How would you design a resilient API layer for this target role?',
        answer: 'I would define SLOs first, then build observability, retries, idempotency, and circuit breakers; finally validate through load and failure testing with measurable latency/error improvements.',
      },
      {
        id: `nmx_${Date.now()}_2`,
        category: 'behavioral',
        question: 'Describe a time you handled conflicting stakeholder priorities.',
        answer: 'I aligned stakeholders around shared success metrics, decomposed delivery into milestones, and communicated tradeoffs early, resulting in predictable execution and reduced escalation.',
      },
      {
        id: `nmx_${Date.now()}_3`,
        category: 'system-design',
        question: 'How would you scale a real-time job matching system?',
        answer: 'I would separate ingestion, ranking, and serving paths; use event-driven processing, cache hot recommendations, and instrument end-to-end KPIs to optimize throughput and relevance.',
      },
    ]

    res.json({
      items: fallback,
      fallback: true,
      warning: err instanceof Error ? err.message : 'Sarvam unavailable. Fallback interview set generated.',
    })
  }
})

router.post('/interview/cross-question', async (req, res) => {
  const question = String(req.body?.question || '').trim()
  const userAnswer = String(req.body?.answer || '').trim()
  const category = String(req.body?.category || 'technical').trim().toLowerCase()
  const key = String(req.body?.key || DEFAULT_SARVAM_KEY).trim()

  if (!question || !userAnswer) {
    res.status(400).json({ error: 'Question and answer are required.' })
    return
  }

  const prompt = [
    'You are Nexus-Mirror operating in Recursive Cross-Questioning mode.',
    'Phase A (Scan): analyze the user answer and identify either ONE concrete technical claim or a Logic Gap.',
    'Phase B (Grill): as a skeptical lead engineer, produce ONE challenging follow-up question strictly grounded in the Phase A finding.',
    'Return strict JSON with this shape only:',
    '{',
    '  "phaseA": {',
    '    "detectedType": "technical-claim"|"logic-gap",',
    '    "technicalClaim": string,',
    '    "logicGap": string,',
    '    "thinOrNonTechnical": boolean,',
    '    "reason": string',
    '  },',
    '  "phaseB": { "followUpQuestion": string },',
    '  "pressureDelta": number',
    '}',
    'Rules:',
    '- If answer is vague, generic, or non-technical, set thinOrNonTechnical=true and pressureDelta between 15 and 25.',
    '- If answer is strong technical, set pressureDelta between 5 and 12.',
    '- Ask only one follow-up question.',
    `CATEGORY: ${category}`,
    `QUESTION: ${question}`,
    `ANSWER: ${userAnswer}`,
  ].join('\n\n')

  try {
    const sarvamRaw = await callSarvamWithRetry({
      apiKey: key,
      messages: [
        { role: 'system', content: 'You are Nexus-Mirror. Return strict JSON only.' },
        { role: 'user', content: prompt },
      ],
      attempts: 3,
    })

    const parsed = tryParseJsonLoose(sarvamRaw)
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON payload from Sarvam cross-questioning')
    }

    const phaseA = parsed.phaseA && typeof parsed.phaseA === 'object' ? parsed.phaseA : {}
    const phaseB = parsed.phaseB && typeof parsed.phaseB === 'object' ? parsed.phaseB : {}
    const delta = Number(parsed.pressureDelta)

    const payload = {
      phaseA: {
        detectedType: String(phaseA.detectedType || '').toLowerCase() === 'technical-claim' ? 'technical-claim' : 'logic-gap',
        technicalClaim: String(phaseA.technicalClaim || '').trim(),
        logicGap: String(phaseA.logicGap || '').trim(),
        thinOrNonTechnical: Boolean(phaseA.thinOrNonTechnical),
        reason: String(phaseA.reason || '').trim(),
      },
      phaseB: {
        followUpQuestion: String(phaseB.followUpQuestion || '').trim(),
      },
      pressureDelta: Number.isFinite(delta) ? Math.max(0, Math.min(30, Math.round(delta))) : 10,
      mode: 'sarvam',
    }

    if (!payload.phaseB.followUpQuestion) {
      throw new Error('Missing follow-up question in cross-questioning response')
    }

    res.json(payload)
  } catch (err) {
    const fallback = buildMirrorFallbackCrossQuestion({ question, userAnswer, category })
    res.json({
      ...fallback,
      fallback: true,
      warning: normalizeSarvamError(err),
    })
  }
})

export default router
