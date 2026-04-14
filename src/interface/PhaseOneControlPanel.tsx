import { FileText, Loader2, Play } from 'lucide-react'
import { useRef, useState } from 'react'
import { useCoreStore } from '../integration/store/coreStore'
import { useUiStore } from '../integration/store/uiStore'
import { jsPDF } from 'jspdf'

function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function buildFallbackStrategist(resume: string, jd: string) {
  const jdTokens = tokenize(jd)
  const resumeSet = new Set(tokenize(resume))
  const freq = new Map<string, number>()
  jdTokens.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1))

  const priorities = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .filter((k) => !['with', 'from', 'that', 'this', 'your', 'have', 'need'].includes(k))
    .slice(0, 5)

  const gaps = priorities.filter((p) => !resumeSet.has(p)).slice(0, 3)
  const strengths = priorities.filter((p) => resumeSet.has(p)).slice(0, 3)

  return {
    priorities: priorities.length ? priorities : ['alignment', 'impact', 'delivery'],
    gaps: gaps.length ? gaps : ['quantified metrics', 'domain keywords'],
    strengths: strengths.length ? strengths : ['engineering delivery', 'ownership'],
  }
}

function buildFallbackResume(resume: string, jd: string, strategist: { priorities: string[] }) {
  const topJD = jd.split('\n').map((x) => x.trim()).filter(Boolean)[0] || 'target role'
  const focus = strategist.priorities.slice(0, 3).join(', ')
  return `${resume.trim()}\n\nPROFESSIONAL SUMMARY\nRole-aligned profile targeting ${topJD}.\nFocused strengths: ${focus}.\n\nTARGETED BULLETS\n- Delivered production-grade initiatives with measurable reliability and performance improvements.\n- Converted complex requirements into scalable implementations with clear execution outcomes.\n- Prioritized recruiter-relevant impact language aligned to the job description.`.trim()
}

function buildFallbackAnalysis(strategist: { priorities: string[]; gaps: string[]; strengths: string[] }) {
  const ats = Math.min(92, Math.max(60, 72 + strategist.priorities.length * 3 - strategist.gaps.length * 2))
  return {
    atsCompatibility: ats,
    skillGaps: [
      ...strategist.strengths.slice(0, 2).map((s) => ({ skill: s, status: 'verified' as const })),
      ...strategist.gaps.slice(0, 3).map((g) => ({ skill: g, status: 'gap' as const })),
    ],
    interviewReadiness: {
      technicalDeepDive: Math.min(95, ats + 6),
      behavioralQuestions: Math.max(58, 80 - strategist.gaps.length * 4),
      systemDesign: Math.min(94, ats + 3),
    },
    activityFeed: [
      {
        id: `fb_${Date.now()}_1`,
        timestamp: Date.now(),
        agent: 'Nexus-Writer',
        action: 'Fallback Resume Tailoring Complete',
        details: 'Generated optimized output using local resilience mode.',
        status: 'completed' as const,
      },
      {
        id: `fb_${Date.now()}_2`,
        timestamp: Date.now() - 60000,
        agent: 'Nexus-Strategist',
        action: 'Fallback JD Analysis',
        details: `${strategist.priorities.length} priorities and ${strategist.gaps.length} gaps inferred locally.`,
        status: strategist.gaps.length > 0 ? ('warning' as const) : ('success' as const),
      },
    ],
    pipeline: [
      { id: 'discovery', title: 'Job Discovery', cards: [{ id: 'd1', title: 'Target Role Selected', status: 'JD Parsed' }] },
      { id: 'tailoring', title: 'Resume Tailoring', cards: [{ id: 't1', title: 'Fallback Tailored Draft', status: 'Complete', progress: 100 }] },
      { id: 'proof-check', title: 'Proof-of-Work Verification', cards: strategist.gaps.map((g, i) => ({ id: `p${i}`, title: g, status: 'Needs proof' })) },
      { id: 'ready', title: 'Ready to Submit', cards: [{ id: 'r1', title: 'Tailored Package', status: 'Ready' }] },
      { id: 'submitted', title: 'Submitted & Tracking', cards: [] },
    ],
  }
}

function toFriendlyFallbackMessage(err: unknown): string {
  const raw = String((err as Error)?.message || '').toLowerCase()
  if (raw.includes('rate-limited') || raw.includes('fallback generation was used')) {
    return ''
  }
  if (
    raw.includes('quota') ||
    raw.includes('rate') ||
    raw.includes('limit') ||
    raw.includes('resource exhausted') ||
    raw.includes('high demand')
  ) {
    return 'Sarvam API is rate-limited right now. Generated optimized fallback resume + analytics.'
  }
  return 'Sarvam API is temporarily unavailable. Generated optimized fallback resume + analytics.'
}

export default function PhaseOneControlPanel() {
  const {
    currentResume,
    structuredResume,
    setCurrentResumeContent,
    setStructuredResume,
    setTargetJD,
    setResumeAnalysis,
    clearResumeAnalysis,
    addNexusActivityEntry,
    appendAgentHistory,
    addTask,
    updateTaskStatus,
  } = useCoreStore()
  const { setAgentStatus } = useUiStore()

  const fileRef = useRef<HTMLInputElement | null>(null)
  const [resumeFileName, setResumeFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  void structuredResume
  void jsPDF

  const canRun = currentResume.content.trim().length > 30 && currentResume.targetJD.trim().length > 30

  const handlePdfUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a valid PDF resume.')
      return
    }

    setError(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('resumePdf', file)
      const res = await fetch('/api/resume/extract', {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to extract resume PDF')
      }

      setCurrentResumeContent(json.text || '')
      setResumeFileName(json.fileName || file.name)
      clearResumeAnalysis()
      addNexusActivityEntry({
        agentType: 'writer',
        action: 'Resume PDF Parsed',
        result: {
          fileName: json.fileName || file.name,
          pages: json.pages || 1,
          preview: String(json.text || '').slice(0, 180),
        },
        impact: 'positive',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF extraction failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRun = async () => {
    setError(null)
    setLoading(true)

    const workingAgents = [2, 3, 4, 5]
    const taskIds: string[] = []

    try {
      setAgentStatus(1, 'talking')
      workingAgents.forEach((agentId) => setAgentStatus(agentId, 'working'))

      const taskMap = [
        { agentId: 2, title: 'Resume Visual Audit' },
        { agentId: 3, title: 'JD Intent Mining' },
        { agentId: 4, title: 'Resume Tailoring Draft' },
        { agentId: 5, title: 'Role Fit Scoring' },
      ]

      taskMap.forEach(({ agentId, title }) => {
        const t = addTask({
          title,
          description: `Phase 1 pipeline execution: ${title}`,
          assignedAgentId: agentId,
          status: 'in_progress',
          requiresUserApproval: false,
        })
        taskIds.push(t.id)
      })

      addNexusActivityEntry({
        agentType: 'director',
        action: 'Phase 1 Pipeline Started',
        result: 'Nexus agents routed to active desk workflows.',
        impact: 'positive',
      })

      appendAgentHistory(1, 'assistant', ['Nexus Director: Team, we begin resume optimization now. Strategist, extract hiring intent. Writer, prepare quantified rewrite.'])
      appendAgentHistory(3, 'assistant', ['Nexus Strategist: Parsing JD constraints and expected outcomes. I will return target priorities and risk gaps.'])
      appendAgentHistory(4, 'assistant', ['Nexus Writer: Understood. I will translate strategy into concise achievement bullets with measurable impact.'])
      appendAgentHistory(2, 'assistant', ['Nexus Vision: I will validate first-scan readability and recruiter attention flow across top sections.'])

      const res = await fetch('/api/resume/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: currentResume.content,
          jd: currentResume.targetJD,
        }),
      })

      const raw = await res.text()
      let json: any = null
      try {
        json = JSON.parse(raw)
      } catch {
        json = null
      }
      if (!res.ok) {
        throw new Error(json?.error || `Failed to run tailoring pipeline (${res.status})`)
      }

      if (!json || (!json.tailoredResume && !json.analysis)) {
        throw new Error('Tailor API returned invalid payload; activating failsafe output.')
      }

      if (json.warning) {
        const warn = String(json.warning || '').trim()
        if (warn && !warn.toLowerCase().includes('rate-limited. fallback generation was used')) {
          setError(warn)
        } else {
          setError(null)
        }
      } else if (json.modelUsed) {
        setError(null)
      }

      setCurrentResumeContent(json.tailoredResume || currentResume.content)
      setStructuredResume(json.structuredResume || null)
      if (json.analysis) {
        setResumeAnalysis(json.analysis)
      } else {
        clearResumeAnalysis()
      }

      addNexusActivityEntry({
        agentType: 'writer',
        action: 'Phase 1 Pipeline Completed',
        result: 'Tailored resume and analytics delivered.',
        impact: 'positive',
      })

      appendAgentHistory(1, 'assistant', ['Nexus Director: Resume package optimized. Review suggested final draft and proceed to submission staging.'])
    } catch (err) {
      const strategist = buildFallbackStrategist(currentResume.content, currentResume.targetJD)
      const fallbackResume = buildFallbackResume(currentResume.content, currentResume.targetJD, strategist)
      const fallbackAnalysis = buildFallbackAnalysis(strategist)

      setCurrentResumeContent(fallbackResume)
      setStructuredResume(null)
      setResumeAnalysis(fallbackAnalysis as any)
      const friendly = toFriendlyFallbackMessage(err)
      setError(friendly || null)
      addNexusActivityEntry({
        agentType: 'director',
        action: 'Phase 1 Pipeline Warning',
        result: err instanceof Error ? err.message : 'Pipeline failed unexpectedly',
        impact: 'warning',
      })
    } finally {
      taskIds.forEach((id) => updateTaskStatus(id, 'done'))
      setAgentStatus(1, 'idle')
      workingAgents.forEach((agentId) => setAgentStatus(agentId, 'idle'))
      setLoading(false)
    }
  }

  return (
    <div className="px-6 pt-3 pb-4 border-b border-zinc-100 bg-white/90 backdrop-blur-sm">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div className="xl:col-span-4 min-h-24 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handlePdfUpload(file)
            }}
          />
          <div className="h-full flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Resume PDF Input</div>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-zinc-600 hover:bg-zinc-100"
            >
              <FileText size={12} />
              {resumeFileName ? `Loaded: ${resumeFileName}` : 'Upload Resume PDF'}
            </button>
            <div className="mt-2 text-[10px] text-zinc-500 line-clamp-2">
              {currentResume.content ? `${currentResume.content.slice(0, 140)}...` : 'Extracted text preview appears here after PDF upload.'}
            </div>
          </div>
        </div>
        <textarea
          value={currentResume.targetJD}
          onChange={(e) => {
            setTargetJD(e.target.value)
            if (!e.target.value.trim()) clearResumeAnalysis()
          }}
          placeholder="Paste Job Description"
          className="xl:col-span-6 min-h-24 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-darkDelegation/20"
        />

        <div className="xl:col-span-2 flex flex-col gap-2">
          <button
            onClick={handleRun}
            disabled={!canRun || loading}
            className="h-full min-h-24 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Tailoring
              </>
            ) : (
              <>
                <Play size={12} />
                Run Phase 1
              </>
            )}
          </button>
          {error && <div className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1">{error}</div>}
        </div>
      </div>
    </div>
  )
}
