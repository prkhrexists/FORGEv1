import { Loader2, MessageSquare, Sparkles, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCoreStore, type InterviewQAItem } from '../integration/store/coreStore'

interface NexusMirrorModalProps {
  onClose: () => void
}

interface CrossQuestionResult {
  phaseA: {
    detectedType: 'technical-claim' | 'logic-gap'
    technicalClaim: string
    logicGap: string
    thinOrNonTechnical: boolean
    reason: string
  }
  phaseB: {
    followUpQuestion: string
  }
  pressureDelta: number
  mode?: string
  fallback?: boolean
  warning?: string
}

export default function NexusMirrorModal({ onClose }: NexusMirrorModalProps) {
  const {
    currentResume,
    runtimeKeys,
    nexusMirrorItems,
    setNexusMirrorItems,
    addNexusActivityEntry,
    interviewSessions,
  } = useCoreStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pressureMeter, setPressureMeter] = useState(8)
  const [answersByItem, setAnswersByItem] = useState<Record<string, string>>({})
  const [crossByItem, setCrossByItem] = useState<Record<string, CrossQuestionResult>>({})
  const [grillingItemId, setGrillingItemId] = useState<string | null>(null)

  const canRun = useMemo(
    () => currentResume.content.trim().length > 30 && currentResume.targetJD.trim().length > 30,
    [currentResume.content, currentResume.targetJD]
  )

  const runInterviewPrep = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/interview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: currentResume.content,
          jd: currentResume.targetJD,
          key: runtimeKeys.sarvam,
        }),
      })

      const raw = await res.text()
      let json: any = null
      try {
        json = JSON.parse(raw)
      } catch {
        json = null
      }

      if (!json) {
        throw new Error('Interview service returned HTML/non-JSON. Ensure backend API is running on port 8787.')
      }

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to generate interview set')
      }

      const items: InterviewQAItem[] = Array.isArray(json?.items) ? json.items : []
      setNexusMirrorItems(items)
      setAnswersByItem({})
      setCrossByItem({})
      setPressureMeter(8)

      useCoreStore.setState({
        interviewSessions: [
          ...interviewSessions,
          {
            id: `session_${Date.now()}`,
            jobId: `job_${Date.now()}`,
            duration: 12,
            weaknesses: [],
            strengths: ['Role-focused answers', 'Quantified project impact'],
            transcript: items.map((i) => `Q: ${i.question}\nA: ${i.answer}`).join('\n\n'),
          },
        ],
      })

      addNexusActivityEntry({
        agentType: 'mirror',
        action: 'Interview Q&A Generated',
        result: `${items.length} tailored interview prompts created via Sarvam.`,
        impact: 'positive',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nexus-Mirror failed')
      addNexusActivityEntry({
        agentType: 'mirror',
        action: 'Interview Generation Warning',
        result: err instanceof Error ? err.message : 'Unknown generation error',
        impact: 'warning',
      })
    } finally {
      setLoading(false)
    }
  }

  const runCrossQuestioning = async (item: InterviewQAItem) => {
    const userAnswer = (answersByItem[item.id] || '').trim()
    if (!userAnswer) {
      setError('Add your answer first to run recursive cross-questioning.')
      return
    }

    setError(null)
    setGrillingItemId(item.id)
    try {
      const res = await fetch('/api/interview/cross-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: item.question,
          answer: userAnswer,
          category: item.category,
          key: runtimeKeys.sarvam,
        }),
      })

      const raw = await res.text()
      let json: CrossQuestionResult | null = null
      try {
        json = JSON.parse(raw)
      } catch {
        json = null
      }

      if (!json) {
        throw new Error('Cross-questioning API returned non-JSON payload.')
      }
      if (!res.ok) {
        throw new Error((json as any)?.error || 'Failed to run recursive cross-questioning')
      }

      const delta = Math.max(0, Math.min(30, Number(json.pressureDelta || 0)))
      setPressureMeter((prev) => Math.min(100, prev + delta))
      setCrossByItem((prev) => ({ ...prev, [item.id]: json as CrossQuestionResult }))

      addNexusActivityEntry({
        agentType: 'mirror',
        action: 'Recursive Cross-Questioning Executed',
        result: json.phaseA?.thinOrNonTechnical
          ? `Pressure +${delta}: thin/non-technical answer detected and challenged.`
          : `Pressure +${delta}: technical claim identified and grilled with lead-level follow-up.`,
        impact: json.phaseA?.thinOrNonTechnical ? 'warning' : 'positive',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recursive cross-questioning failed')
      addNexusActivityEntry({
        agentType: 'mirror',
        action: 'Recursive Cross-Questioning Warning',
        result: err instanceof Error ? err.message : 'Unknown recursive interview error',
        impact: 'warning',
      })
    } finally {
      setGrillingItemId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 pointer-events-auto overflow-hidden">
      <div onClick={onClose} className="absolute inset-0 bg-white/60 backdrop-blur-xl" />
      <div className="relative w-full max-w-5xl bg-white rounded-[30px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] p-6 md:p-8 border border-zinc-100 max-h-[90vh] overflow-hidden flex flex-col">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 rounded-full">
          <X size={18} />
        </button>

        <div className="mb-5">
          <h2 className="text-2xl font-black text-darkDelegation tracking-tight">Nexus-Mirror Interview Lab</h2>
          <p className="text-xs text-zinc-500 mt-1">Generate personalized interview questions and suggested answers from resume + JD using Sarvam.</p>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={runInterviewPrep}
            disabled={!canRun || loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-2"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Generate Q&A
          </button>
          {!runtimeKeys.sarvam && (
            <span className="text-[10px] text-zinc-400">Using backend Sarvam key fallback.</span>
          )}
          {error && <span className="text-[10px] text-red-600">{error}</span>}
        </div>

        <div className="mb-4 border border-zinc-100 rounded-xl bg-zinc-50/60 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pressure Meter</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700">{pressureMeter}%</span>
          </div>
          <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pressureMeter >= 75 ? 'bg-red-500' : pressureMeter >= 45 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${pressureMeter}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-zinc-500">Increases when Nexus detects thin or non-technical answers during recursive grilling.</p>
        </div>

        <div className="flex-1 overflow-auto space-y-3 pr-1">
          {nexusMirrorItems.length === 0 ? (
            <div className="h-full min-h-48 border border-dashed border-zinc-200 rounded-xl flex items-center justify-center bg-zinc-50/40">
              <div className="text-center">
                <MessageSquare size={16} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">No interview set generated yet</p>
              </div>
            </div>
          ) : (
            nexusMirrorItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-100 bg-zinc-50/30 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">{item.category}</span>
                </div>
                <p className="text-sm font-bold text-darkDelegation mb-2">Q: {item.question}</p>
                <p className="text-xs text-zinc-700 leading-relaxed">A: {item.answer}</p>

                <div className="mt-3 space-y-2">
                  <textarea
                    value={answersByItem[item.id] || ''}
                    onChange={(e) => setAnswersByItem((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="Type your interview answer here for recursive cross-questioning..."
                    className="w-full min-h-20 bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-darkDelegation/20"
                  />
                  <button
                    onClick={() => runCrossQuestioning(item)}
                    disabled={grillingItemId === item.id}
                    className="px-3 py-2 bg-darkDelegation hover:bg-black disabled:opacity-40 text-white rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-2"
                  >
                    {grillingItemId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Run Recursive Grill
                  </button>
                </div>

                {crossByItem[item.id] && (
                  <div className="mt-3 space-y-2">
                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Phase A - Scan</p>
                      <p className="text-xs text-zinc-700">
                        {crossByItem[item.id].phaseA.detectedType === 'technical-claim'
                          ? `Technical claim: ${crossByItem[item.id].phaseA.technicalClaim || '--'}`
                          : `Logic gap: ${crossByItem[item.id].phaseA.logicGap || '--'}`}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1">{crossByItem[item.id].phaseA.reason || 'No reason returned.'}</p>
                    </div>

                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">Phase B - Grill</p>
                      <p className="text-xs font-semibold text-darkDelegation">{crossByItem[item.id].phaseB.followUpQuestion}</p>
                      <div className="mt-2 text-[10px] text-zinc-500">Pressure impact: +{crossByItem[item.id].pressureDelta}%</div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
