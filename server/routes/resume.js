/**
 * FILE: server/routes/resume.js
 * PURPOSE: Resume extraction, tailoring, bullet generation, and PDF rendering endpoints.
 * DEPENDENCIES: services/gemini, services/sarvam, services/resumeBuilder, services/pdfGenerator, config
 * USED BY: server/index.js
 */

import { Router } from 'express'
import { PDFParse } from 'pdf-parse'
import { upload } from '../middleware/upload.js'
import { GEMINI_API_KEY, DEFAULT_SARVAM_KEY, DEFAULT_RESUME_STRUCTURER_KEY } from '../config.js'
import { callGeminiTextWithRetry } from '../services/gemini.js'
import { callSarvamWithRetry } from '../services/sarvam.js'
import {
  buildFallbackStrategist,
  buildFallbackTailoredResume,
  buildAnalysis,
  normalizeAnalysisShape,
  normalizeStructuredResume,
  structuredToResumeText,
  ensureStructuredResume,
} from '../services/resumeBuilder.js'
import { buildResumePdfFromStructured } from '../services/pdfGenerator.js'
import { normalizeSarvamError, requireEnv } from '../utils/errors.js'
import { tryParseJsonLoose } from '../utils/helpers.js'

const router = Router()

router.post('/resume/extract', upload.single('resumePdf'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Missing resume PDF file' })
    return
  }

  try {
    const parser = new PDFParse({ data: req.file.buffer })
    const textResult = await parser.getText()
    await parser.destroy()
    const text = (textResult.text || '').trim()
    if (!text) {
      res.status(422).json({ error: 'Unable to extract text from PDF' })
      return
    }

    res.json({
      fileName: req.file.originalname,
      pages: textResult.pages?.length || 1,
      text,
    })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to parse PDF' })
  }
})

router.post('/resume/bullet', async (req, res) => {
  const userGeminiKey = req.body?.keys?.gemini
  const runtimeGeminiKey = userGeminiKey || GEMINI_API_KEY
  if (!requireEnv('GEMINI_API_KEY', runtimeGeminiKey, res)) return
  const repoData = req.body?.repoData
  if (!repoData) {
    res.status(400).json({ error: 'Missing repoData payload' })
    return
  }

  const prompt = `Based on these code commits ${JSON.stringify(repoData, null, 2)}, write one high-impact, quantified resume bullet point using Action Verbs.`

  try {
    const bullet = await callGeminiTextWithRetry({
      apiKey: runtimeGeminiKey,
      prompt,
      systemInstruction: 'You are Nexus-Writer. Output exactly one resume bullet as plain text with measurable impact.',
    })
    res.json({ bullet: bullet || 'Improved system reliability and delivery velocity across key repositories with measurable impact.' })
  } catch (err) {
    const fallbackBullet = `Engineered ${repoData?.repository || 'core services'} with ${repoData?.commits || 0}+ commit contributions, improving delivery velocity and production stability across high-impact features.`
    res.json({
      bullet: fallbackBullet,
      fallback: true,
      warning: '',
    })
  }
})

router.post('/resume/tailor', async (req, res) => {
  const resume = String(req.body?.resume || '').trim()
  const jd = String(req.body?.jd || '').trim()
  const keys = req.body?.keys || {}
  const runtimeSarvamKey = String(keys.sarvam || DEFAULT_SARVAM_KEY || '').trim()
  const structurerKey = String(keys.structurer || DEFAULT_RESUME_STRUCTURER_KEY).trim()

  if (!resume || !jd) {
    res.status(400).json({ error: 'Resume and JD are required.' })
    return
  }
  if (!runtimeSarvamKey) {
    res.status(400).json({ error: 'Sarvam API key is required for resume analysis.' })
    return
  }
  void structurerKey

  try {
    const singlePassPrompt = [
      'You are Nexus-Director. Build one complete resume optimization package.',
      'Use the Job Description and Resume to produce strict JSON only with this shape:',
      '{',
      '  "strategist": { "priorities": string[], "gaps": string[], "strengths": string[] },',
      '  "analysis": {',
      '    "atsCompatibility": number(0-100),',
      '    "skillGaps": [{"skill": string, "status": "verified"|"needs-proof"|"gap"}],',
      '    "interviewReadiness": { "technicalDeepDive": number, "behavioralQuestions": number, "systemDesign": number }',
      '  },',
      '  "structuredResume": {',
      '    "header": { "name": string, "title": string, "email": string, "phone": string, "location": string, "links": string[] },',
      '    "summary": string,',
      '    "skills": { "core": string[], "tools": string[], "cloud": string[] },',
      '    "experience": [{ "title": string, "company": string, "location": string, "start": string, "end": string, "bullets": string[] }],',
      '    "projects": [{ "name": string, "bullets": string[] }],',
      '    "education": [{ "degree": string, "school": string, "year": string }],',
      '    "certifications": string[],',
      '    "targetJobSummary": string',
      '  }',
      '}',
      `JOB DESCRIPTION:\n${jd}`,
      `RESUME:\n${resume}`,
    ].join('\n\n')

    const rawPackage = await callSarvamWithRetry({
      apiKey: runtimeSarvamKey,
      messages: [
        { role: 'system', content: 'Return strict JSON only. No markdown.' },
        { role: 'user', content: singlePassPrompt },
      ],
      attempts: 4,
    })

    const parsedPackage = tryParseJsonLoose(rawPackage) || {}
    const strategist = parsedPackage?.strategist || {
      priorities: ['Role alignment', 'Impact-driven bullet optimization'],
      gaps: ['Domain-specific tooling evidence'],
      strengths: ['Engineering delivery and ownership'],
    }

    const fallbackAnalysis = buildAnalysis(strategist)
    const analysis = normalizeAnalysisShape(parsedPackage?.analysis || null, fallbackAnalysis)

    let structuredResume = normalizeStructuredResume(parsedPackage?.structuredResume || null, resume, jd)
    if (!structuredResume?.experience?.length) {
      structuredResume = await ensureStructuredResume({
        resumeText: resume,
        jd,
        sarvamKey: runtimeSarvamKey,
        geminiKey: '',
        structurerKey,
      })
    }

    const structuredResumeText = structuredToResumeText(structuredResume)

    res.json({
      tailoredResume: structuredResumeText,
      structuredResume,
      analysis,
      modelUsed: 'sarvam-m-single-pass',
      structurer: structurerKey ? 'resume-maker-structured-pdf' : 'resume-maker-structured-pdf',
      warning: '',
    })
  } catch (err) {
    console.error('[resume/tailor] model error:', err)
    const strategist = buildFallbackStrategist(resume, jd)
    const tailoredResume = buildFallbackTailoredResume(resume, jd, strategist)
    const usedFallback = true

    const structuredResume = await ensureStructuredResume({
      resumeText: tailoredResume,
      jd,
      sarvamKey: runtimeSarvamKey,
      geminiKey: '',
      structurerKey,
    })
    const structuredResumeText = structuredToResumeText(structuredResume)

    res.json({
      tailoredResume: structuredResumeText,
      structuredResume,
      analysis: buildAnalysis(strategist),
      fallback: usedFallback,
      warning: normalizeSarvamError(err),
      modelUsed: 'resilient-local-fallback',
    })
  }
})

router.post('/resume/render-pdf', async (req, res) => {
  let structuredResume = req.body?.structuredResume
  const resumeText = String(req.body?.resume || '').trim()
  const jd = String(req.body?.jd || '').trim()
  const keys = req.body?.keys || {}
  const runtimeSarvamKey = String(keys.sarvam || DEFAULT_SARVAM_KEY).trim()
  const runtimeGeminiKey = String(keys.gemini || GEMINI_API_KEY).trim()
  const structurerKey = String(keys.structurer || DEFAULT_RESUME_STRUCTURER_KEY).trim()

  if ((!structuredResume || typeof structuredResume !== 'object') && resumeText) {
    structuredResume = await ensureStructuredResume({
      resumeText,
      jd,
      sarvamKey: runtimeSarvamKey,
      geminiKey: runtimeGeminiKey,
      structurerKey,
    })
  }

  if (!structuredResume || typeof structuredResume !== 'object') {
    res.status(400).json({ error: 'structuredResume JSON is required, or provide resume text for auto-structuring.' })
    return
  }

  try {
    const pdfBuffer = await buildResumePdfFromStructured(structuredResume)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="forgev3-structured-resume-${Date.now()}.pdf"`)
    res.send(pdfBuffer)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to render resume PDF' })
  }
})

export default router
