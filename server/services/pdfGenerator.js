/**
 * FILE: server/services/pdfGenerator.js
 * PURPOSE: PDFKit-based resume PDF generation from structured data.
 * DEPENDENCIES: pdfkit
 * USED BY: routes/resume.js
 */

import PDFDocument from 'pdfkit'

export function buildResumePdfFromStructured(sr) {
  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  const chunks = []

  doc.on('data', (chunk) => chunks.push(chunk))

  const h = sr?.header || {}

  const name = String(h.name || '').trim()
  if (name) doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827').text(name.toUpperCase())
  doc.moveDown(0.2)
  const title = String(h.title || '').trim()
  if (title) doc.font('Helvetica').fontSize(10).fillColor('#4B5563').text(title)
  const contactParts = [h.email, h.phone, h.location].filter((x) => x && String(x).trim())
  if (contactParts.length) doc.text(contactParts.join('  |  '))
  if (Array.isArray(h.links) && h.links.length) doc.text(h.links.join('  |  '))
  doc.moveDown(0.6)

  const section = (sectionTitle) => {
    doc.moveDown(0.35)
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1F2937').text(sectionTitle)
    const y = doc.y + 1
    doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).strokeColor('#E5E7EB').stroke()
    doc.moveDown(0.45)
  }

  const summaryText = String(sr.summary || '').trim()
  if (summaryText) {
    section('PROFESSIONAL SUMMARY')
    doc.font('Helvetica').fontSize(10).fillColor('#1F2937').text(summaryText, { lineGap: 2 })
  }

  const skillLines = []
  if (sr.skills?.core?.length) skillLines.push(`Core: ${sr.skills.core.join(', ')}`)
  if (sr.skills?.tools?.length) skillLines.push(`Tools: ${sr.skills.tools.join(', ')}`)
  if (sr.skills?.cloud?.length) skillLines.push(`Cloud: ${sr.skills.cloud.join(', ')}`)
  if (skillLines.length) {
    section('SKILLS')
    skillLines.forEach((line) => doc.font('Helvetica').fontSize(10).fillColor('#1F2937').text(line, { lineGap: 2 }))
  }

  if (Array.isArray(sr.experience) && sr.experience.length) {
    section('EXPERIENCE')
    sr.experience.forEach((exp) => {
      const expTitle = [exp.title, exp.company].filter(Boolean).join(' | ')
      if (expTitle) doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#111827').text(expTitle)
      const dateLine = [exp.location, [exp.start, exp.end].filter(Boolean).join(' - ')].filter(Boolean).join(' ')
      if (dateLine) doc.font('Helvetica').fontSize(9.5).fillColor('#6B7280').text(dateLine)
      ;(exp.bullets || []).forEach((b) => doc.font('Helvetica').fontSize(10).fillColor('#1F2937').text(`• ${b}`, { indent: 10, lineGap: 2 }))
      doc.moveDown(0.4)
    })
  }

  if (Array.isArray(sr.projects) && sr.projects.length) {
    section('PROJECTS')
    sr.projects.forEach((p) => {
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#111827').text(String(p.name || 'Project'))
      ;(p.bullets || []).forEach((b) => doc.font('Helvetica').fontSize(10).fillColor('#1F2937').text(`• ${b}`, { indent: 10, lineGap: 2 }))
      doc.moveDown(0.3)
    })
  }

  if (Array.isArray(sr.education) && sr.education.length) {
    section('EDUCATION')
    sr.education.forEach((e) => {
      const eduTitle = [e.degree, e.school].filter(Boolean).join(' | ')
      if (eduTitle) doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#111827').text(eduTitle)
      if (e.year) doc.font('Helvetica').fontSize(9.5).fillColor('#6B7280').text(String(e.year))
      doc.moveDown(0.25)
    })
  }

  if (Array.isArray(sr.certifications) && sr.certifications.length) {
    section('CERTIFICATIONS')
    sr.certifications.forEach((c) => doc.font('Helvetica').fontSize(10).fillColor('#1F2937').text(`• ${c}`, { indent: 10, lineGap: 2 }))
  }

  doc.end()
  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
  })
}
