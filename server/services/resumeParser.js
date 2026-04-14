/**
 * FILE: server/services/resumeParser.js
 * PURPOSE: Resume text extraction, section detection, and structured data parsing.
 * DEPENDENCIES: None
 * USED BY: server/services/resumeBuilder.js, routes/resume.js
 */

export function isSectionHeader(line) {
  const u = String(line || '').toUpperCase().replace(/[^A-Z\s&]/g, '').trim()
  const knownHeaders = [
    'PROFESSIONAL SUMMARY', 'SUMMARY', 'OBJECTIVE', 'PROFILE', 'ABOUT',
    'SKILLS', 'TECHNICAL SKILLS', 'CORE SKILLS', 'KEY SKILLS',
    'EXPERIENCE', 'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE', 'EMPLOYMENT',
    'PROJECTS', 'KEY PROJECTS', 'PERSONAL PROJECTS', 'SIDE PROJECTS', 'ACADEMIC PROJECTS',
    'EDUCATION', 'ACADEMIC BACKGROUND',
    'CERTIFICATIONS', 'CERTIFICATES', 'LICENSES',
    'AWARDS', 'AWARDS & ACHIEVEMENTS', 'ACHIEVEMENTS', 'HONORS',
    'EXTRACURRICULAR', 'EXTRACURRICULAR ACTIVITIES', 'ACTIVITIES',
    'INTERESTS', 'HOBBIES', 'PUBLICATIONS', 'RESEARCH',
    'TARGETED IMPACT BULLETS', 'TARGETED BULLETS',
  ]
  if (knownHeaders.some((h) => u === h)) return true
  if (u.length < 40 && u.length > 2 && /^[A-Z\s&]+$/.test(u) && u.split(/\s+/).length <= 4) return true
  return false
}

export function classifySection(line) {
  const u = String(line || '').toUpperCase().replace(/[^A-Z\s&]/g, '').trim()
  if (/SUMMARY|OBJECTIVE|PROFILE|ABOUT/.test(u)) return 'summary'
  if (/SKILL/.test(u)) return 'skills'
  if (/EXPERIENCE|EMPLOYMENT/.test(u)) return 'experience'
  if (/PROJECT/.test(u)) return 'projects'
  if (/EDUCATION|ACADEMIC BACKGROUND/.test(u)) return 'education'
  if (/CERTIFICATION|CERTIFICATE|LICENSE/.test(u)) return 'certifications'
  if (/AWARD|ACHIEVEMENT|HONOR/.test(u)) return 'awards'
  if (/EXTRACURRICULAR|ACTIVIT/.test(u)) return 'extracurricular'
  return 'other'
}

export function extractFromResumeText(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean)
  const fullText = text || ''

  const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const email = emailMatch ? emailMatch[0] : ''

  const phoneMatch = fullText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/)
  const phone = phoneMatch ? phoneMatch[0].trim() : ''

  const linkPatterns = fullText.match(/(?:https?:\/\/[^\s,]+|(?:linkedin|github|gitlab|bitbucket)\.com\/[^\s,]+)/gi)
  const links = linkPatterns ? [...new Set(linkPatterns.map((l) => l.trim()))].slice(0, 4) : []

  const locationPatterns = fullText.match(/(?:Remote|(?:[A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*(?:[A-Z][a-z]+(?:\s[A-Z][a-z]+)*|[A-Z]{2}))/g)
  const location = locationPatterns ? locationPatterns[0] : ''

  let name = ''
  if (lines.length > 0) {
    const firstLine = lines[0]
    if (firstLine.length < 60 && !firstLine.includes('@') && !isSectionHeader(firstLine)) {
      name = firstLine
    }
  }

  let title = ''
  for (let i = 1; i < Math.min(5, lines.length); i++) {
    const line = lines[i]
    if (line.length < 60 && !line.includes('@') && !line.includes('|') && !/^\+?\d/.test(line) &&
      !line.startsWith('http') && !isSectionHeader(line)) {
      title = line
      break
    }
  }

  // Build section ranges dynamically
  const sectionRanges = []
  for (let i = 0; i < lines.length; i++) {
    if (isSectionHeader(lines[i])) {
      sectionRanges.push({ idx: i, type: classifySection(lines[i]), header: lines[i] })
    }
  }
  for (let i = 0; i < sectionRanges.length; i++) {
    sectionRanges[i].endIdx = i + 1 < sectionRanges.length ? sectionRanges[i + 1].idx : lines.length
  }

  function getSectionLines(type) {
    const sec = sectionRanges.find((s) => s.type === type)
    if (!sec) return []
    return lines.slice(sec.idx + 1, sec.endIdx)
  }

  // Summary
  let summary = ''
  const summaryLines = getSectionLines('summary')
  if (summaryLines.length) {
    summary = summaryLines.filter((l) => !l.startsWith('-') && !l.startsWith('•')).join(' ').trim()
  }

  // Skills
  const skillsResult = { core: [], tools: [], cloud: [] }
  const skillSectionLines = getSectionLines('skills')
  for (const sl of skillSectionLines) {
    const coreMatch = sl.match(/^(?:Core|Languages?|Programming)[:\s]+(.+)/i)
    const toolsMatch = sl.match(/^(?:Tools?|Frameworks?\s*(?:&|and)?\s*(?:Infrastructure)?|Libraries?|Vibecoding|Agentic\s*Tools?)[:\s]+(.+)/i)
    const cloudMatch = sl.match(/^(?:Cloud|Infrastructure|DevOps|Platforms?)[:\s]+(.+)/i)
    const conceptMatch = sl.match(/^(?:Core\s*Concepts?|Methodolog\w*)[:\s]+(.+)/i)
    if (coreMatch) skillsResult.core.push(...coreMatch[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean))
    else if (toolsMatch) skillsResult.tools.push(...toolsMatch[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean))
    else if (cloudMatch) skillsResult.cloud.push(...cloudMatch[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean))
    else if (conceptMatch) skillsResult.tools.push(...conceptMatch[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean))
    else {
      const items = sl.split(/[,;]/).map((s) => s.trim()).filter((s) => s && s.length < 40)
      if (items.length > 1) skillsResult.core.push(...items)
    }
  }

  // Generic entry parser for experience/projects (handles pipe-separated titles and bullet points)
  function parseEntries(sectionLines) {
    const entries = []
    let current = null
    for (const el of sectionLines) {
      const isBullet = /^[-•*·δ]\s/.test(el) || /^[δ·]\s/.test(el)
      const hasDate = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}/i.test(el) ||
        /\b\d{4}\s*[-–]\s*(?:Present|\d{4})\b/i.test(el)
      const hasPipe = el.includes('|')
      if (isBullet && current) {
        current.bullets.push(el.replace(/^[-•*·δ]\s*/, '').trim())
      } else if (hasPipe && !isBullet) {
        if (current && (current.title || current.bullets.length)) entries.push(current)
        const parts = el.split('|').map((p) => p.trim())
        const dateInParts = parts.find((p) => /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}/i.test(p) || /^\w+\s+\d{4}$/.test(p))
        const nonDateParts = parts.filter((p) => p !== dateInParts)
        current = {
          title: nonDateParts[0] || '',
          company: nonDateParts[1] || '',
          location: nonDateParts[2] || '',
          start: '', end: '',
          bullets: [],
        }
        if (dateInParts) {
          const dp = dateInParts.split(/\s*[-–]\s*/)
          current.start = dp[0]?.trim() || ''
          current.end = dp[1]?.trim() || dateInParts.trim()
        }
      } else if (hasDate && current && !current.start) {
        const dateParts = el.trim().split(/\s*[-–]\s*/)
        current.start = dateParts[0]?.trim() || ''
        current.end = dateParts[1]?.trim() || ''
      } else if (!isBullet && el.length > 5 && el.length < 120 && !hasDate) {
        if (current && (current.title || current.bullets.length)) entries.push(current)
        current = { title: el, company: '', location: '', start: '', end: '', bullets: [] }
      }
    }
    if (current && (current.title || current.bullets.length)) entries.push(current)
    return entries
  }

  // Experience
  const experience = parseEntries(getSectionLines('experience'))

  // Projects
  const rawProjects = parseEntries(getSectionLines('projects'))
  const projects = rawProjects.map((p) => ({ name: p.title || p.company || '', bullets: p.bullets || [] }))

  // Education
  const education = []
  const eduLines = getSectionLines('education')
  let currentEdu = null
  for (const el of eduLines) {
    if (el.includes('|')) {
      const parts = el.split('|').map((p) => p.trim())
      if (currentEdu) education.push(currentEdu)
      currentEdu = { degree: parts[0] || '', school: parts[1] || '', year: parts[2] || '' }
    } else if (/\b(B\.?Tech|M\.?Tech|B\.?S\.?|M\.?S\.?|Bachelor|Master|Ph\.?D|MBA|Diploma|Associate)/i.test(el)) {
      if (currentEdu) education.push(currentEdu)
      currentEdu = { degree: el, school: '', year: '' }
    } else if (currentEdu && !currentEdu.school && el.length > 3 && el.length < 80) {
      currentEdu.school = el
    } else if (currentEdu && /\d{4}/.test(el)) {
      const yrMatch = el.match(/\d{4}/)
      currentEdu.year = yrMatch ? yrMatch[0] : ''
    }
  }
  if (currentEdu) education.push(currentEdu)

  // Awards, Extracurricular → certifications
  const awards = getSectionLines('awards')
  const extracurricular = getSectionLines('extracurricular')
  const certifications = [...awards, ...extracurricular]
    .filter((l) => l.length > 3)
    .map((l) => l.replace(/^[-•*·δ]\s*/, '').trim())
    .filter(Boolean)

  return { name, title, email, phone, location, links, summary, skills: skillsResult, experience, projects, education, certifications }
}
