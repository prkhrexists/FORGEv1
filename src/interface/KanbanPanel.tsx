import { AlertTriangle, CheckCircle2, Send, ShieldCheck, Sparkles, Target } from 'lucide-react'
import React from 'react'
import { useCoreStore } from '../integration/store/coreStore'

interface ForgeCard {
  id: string
  title: string
  metrics?: { alignment: number; competition: string; daysOld: number }
  tags?: string[]
  status?: string
  progress?: number
  warnings?: string[]
  score?: { ats: number; alignment: number }
  action?: string
  actionType?: 'download-pdf'
  nextAction?: string
}

interface ForgeColumn {
  id: string
  title: string
  color: 'purple' | 'blue' | 'yellow' | 'green' | 'gray'
  cards: ForgeCard[]
}

const colorClasses: Record<ForgeColumn['color'], { dot: string; badge: string }> = {
  purple: { dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700' },
  blue: { dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700' },
  yellow: { dot: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-700' },
  green: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  gray: { dot: 'bg-zinc-400', badge: 'bg-zinc-100 text-zinc-600' },
}

interface KanbanPanelProps {
  height?: number
}

function PipelineCard({ card, columnColor, onDownloadResume, canDownload }: { card: ForgeCard; columnColor: ForgeColumn['color']; onDownloadResume: () => void; canDownload: boolean }) {

  return (
    <div className="bg-white rounded-lg border border-black/5 shadow-sm p-3 space-y-2 group relative">
      <div className="flex items-start justify-between gap-1">
        <h3 className="text-xs text-darkDelegation leading-snug font-bold flex-1">{card.title}</h3>
      </div>

      {card.status && (
        <div className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 ${colorClasses[columnColor].badge}`}>
          <Sparkles size={10} />
          {card.status}
        </div>
      )}

      {card.progress !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span>Progress</span>
            <span>{card.progress}%</span>
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${card.progress}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {card.metrics && (
          <div className="text-[10px] text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-md p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span>Alignment</span>
              <span className="font-black text-emerald-600">{card.metrics.alignment}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Competition</span>
              <span className="font-bold">{card.metrics.competition}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Age</span>
              <span className="font-bold">{card.metrics.daysOld} days</span>
            </div>
          </div>
        )}

        {card.score && (
          <div className="text-[10px] text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-md p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span>ATS</span>
              <span className="font-black text-emerald-600">{card.score.ats}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Role Alignment</span>
              <span className="font-black text-blue-600">{card.score.alignment}%</span>
            </div>
          </div>
        )}

        {card.tags && (
          <div className="flex flex-wrap gap-1">
            {card.tags.map((tag) => (
              <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 uppercase tracking-wide">
                {tag}
              </span>
            ))}
          </div>
        )}

        {card.warnings?.map((warning) => (
          <div key={warning} className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-md px-2 py-1.5">
            <AlertTriangle size={10} />
            {warning}
          </div>
        ))}

        {card.action && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (card.actionType === 'download-pdf') {
                onDownloadResume()
                return
              }
              console.log('Ghost-Protocol clicked - Chrome Extension will be integrated here')
              window.alert('Ghost-Protocol coming soon! This will auto-fill job portals.')
            }}
            disabled={card.actionType === 'download-pdf' ? !canDownload : false}
            className={`w-full flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${card.actionType === 'download-pdf'
              ? canDownload
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
          >
            <ShieldCheck size={12} />
            {card.action}
          </button>
        )}

        {card.nextAction && (
          <div className="text-[10px] font-bold text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-md p-2">Next: {card.nextAction}</div>
        )}
      </div>
    </div>
  )
}

export function KanbanPanel({ height = 320 }: KanbanPanelProps) {
  const { hasResumeAnalysis, resumeAnalysis, currentResume, discoveredJobs, structuredResume } = useCoreStore()

  const [downloading, setDownloading] = React.useState(false)

  const canDownload = !!currentResume.content.trim()

  const handleDownloadResume = async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/resume/render-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredResume: structuredResume || undefined,
          resume: currentResume.content,
          jd: currentResume.targetJD,
          keys: {
            sarvam: 'sk_nh5o7dm2_ulhPSYrePKreWNDf9jWG5wgy',
            gemini: 'AIzaSyB4HpGrIfcWEY6_GmTP52MvcLHlML7FZwQ',
            structurer: 'VSFqSoeFoKCdVUiXxxpUcXuTAQMHqpKtBpwhMZPvrgazufCKugpdIzMGCMKvslhe',
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to render resume PDF')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `forgev3-structured-resume-${Date.now()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const placeholderColumns: ForgeColumn[] = [
    {
      id: 'discovery',
      title: 'Job Discovery',
      color: 'purple',
      cards: discoveredJobs.length
        ? discoveredJobs.slice(0, 3).map((job) => ({
          id: job.id,
          title: `${job.title} - ${job.company}`,
          status: 'Target Role Selected',
          metrics: {
            alignment: Math.round(job.alignmentScore),
            competition: job.competitionLevel,
            daysOld: 1,
          },
          tags: [`Blue Ocean ${Math.round(job.blueOceanScore)}%`],
          nextAction: job.nexusMatchReason,
        }))
        : [
          {
            id: 'ph-discovery',
            title: 'Target Role Selected',
            status: '--',
            warnings: ['--'],
          },
        ],
    },
    {
      id: 'tailoring',
      title: 'Resume Tailoring',
      color: 'blue',
      cards: [
        {
          id: 'ph-tailoring',
          title: 'Tailored Resume Draft',
          status: '--',
          progress: 0,
        },
      ],
    },
    {
      id: 'proof-check',
      title: 'Proof-of-Work Verification',
      color: 'yellow',
      cards: [
        {
          id: 'ph-proof',
          title: 'Verification Queue',
          status: '--',
          warnings: ['--'],
        },
      ],
    },
    {
      id: 'ready',
      title: 'Ready to Submit',
      color: 'green',
      cards: [
        {
          id: 'ph-ready',
          title: 'Tailored Package',
          status: '--',
          action: downloading ? 'Preparing...' : 'Download Resume PDF',
          actionType: 'download-pdf',
        },
      ],
    },
  ]

  const mappedColumns: ForgeColumn[] = hasResumeAnalysis && resumeAnalysis
    ? resumeAnalysis.pipeline
      .filter((column) => column.id !== 'submitted')
      .map((column, index) => {
        if (column.id === 'discovery') {
          const discoveryCards = discoveredJobs.length
            ? discoveredJobs.slice(0, 3).map((job) => ({
              id: job.id,
              title: `${job.title} - ${job.company}`,
              status: 'Target Role Selected',
              metrics: {
                alignment: Math.round(job.alignmentScore),
                competition: job.competitionLevel,
                daysOld: 1,
              },
              tags: [
                `Blue Ocean ${Math.round(job.blueOceanScore)}%`,
                job.source === 'company-careers' ? 'Direct Career Page' : 'Market Listing',
              ],
              nextAction: job.nexusMatchReason,
            }))
            : [{
              id: 'ph-discovery',
              title: 'Target Role Selected',
              status: '--',
              warnings: ['--'],
            }]

          return {
            id: column.id,
            title: 'Job Discovery',
            color: 'purple' as ForgeColumn['color'],
            cards: discoveryCards,
          }
        }

        const cards = (column.cards as ForgeCard[]).map((c) => ({ ...c }))
        if (column.id === 'ready' && cards.length > 0) {
          cards[0] = {
            ...cards[0],
            action: downloading ? 'Preparing...' : 'Download Resume PDF',
            actionType: 'download-pdf',
          }
        }

        return {
          id: column.id,
          title: column.title,
          color: (['purple', 'blue', 'yellow', 'green'][index] as ForgeColumn['color']) || 'gray',
          cards,
        }
      })
    : []

  const visibleColumns = hasResumeAnalysis && mappedColumns.length ? mappedColumns : placeholderColumns

  return (
    <div
      className="w-full bg-white border-t border-black/8 flex flex-col pointer-events-auto shrink-0 relative"
      style={{ height }}
    >
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-zinc-50/20">
        <div className="flex h-full min-w-max px-5 py-4 gap-4">
          {visibleColumns.map((column) => {
            const tone = colorClasses[column.color]
            return (
              <div key={column.id} className="w-56 flex flex-col gap-3">
                <div className="flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 leading-none">
                      {column.title}
                    </span>
                    <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-400 text-[9px] font-bold rounded-md min-w-4.5 text-center">
                      {column.cards.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
                  {column.cards.map((card) => (
                    <PipelineCard key={card.id} card={card} columnColor={column.color} onDownloadResume={handleDownloadResume} canDownload={canDownload} />
                  ))}
                  {column.cards.length === 0 && (
                    <div className="border border-dashed border-zinc-100 rounded-lg p-4 flex items-center justify-center select-none">
                      <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Empty</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="h-8 border-t border-zinc-100 px-5 flex items-center justify-between bg-white">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Application Pipeline</span>
        <div className="flex items-center gap-3 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
          <span className="flex items-center gap-1"><Target size={10} /> Tailoring</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Ready</span>
          <span className="flex items-center gap-1"><Send size={10} /> Verification</span>
        </div>
      </div>
    </div>
  )
}
