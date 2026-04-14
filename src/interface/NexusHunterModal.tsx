import { ExternalLink, Loader2, Search, Target, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCoreStore } from '../integration/store/coreStore'

interface NexusHunterModalProps {
  onClose: () => void
}

export default function NexusHunterModal({ onClose }: NexusHunterModalProps) {
  const {
    currentResume,
    userCareerProfile,
    runtimeKeys,
    discoveredJobs,
    setDiscoveredJobs,
    addNexusActivityEntry,
  } = useCoreStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canRun = useMemo(() => currentResume.content.trim().length > 30, [currentResume.content])

  const runDiscovery = async () => {
    setError(null)
    setLoading(true)
    try {
      const targetRole = currentResume.targetJD.trim().split('\n')[0]?.slice(0, 120) || userCareerProfile.targetRole || 'AI Engineer'
      const res = await fetch('/api/jobs/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: currentResume.content,
          targetRole,
          key: runtimeKeys.gemini,
        }),
      })

      const raw = await res.text()
      let json: any = null
      try {
        json = JSON.parse(raw)
      } catch {
        json = null
      }
      if (!res.ok || !json) {
        throw new Error(json?.error || 'Nexus-Hunter discovery failed')
      }

      const mapped = (Array.isArray(json.items) ? json.items : []).slice(0, 3).map((item: any, idx: number) => ({
        id: `job_${Date.now()}_${idx}`,
        title: String(item.job_title || 'Target Role'),
        company: String(item.company_name || 'Company'),
        url: String(item.application_link || '#'),
        alignmentScore: Number(item.alignment_score || 80),
        blueOceanScore: Number(item.blue_ocean_score || 75),
        nexusMatchReason: String(item.nexus_match_reason || 'Strong fit based on Nexus profile.'),
        competitionLevel: (String(item.competition_level || 'Medium') as 'Low' | 'Medium' | 'High'),
        discoveredAt: Date.now(),
        source: (String(item.source || 'hidden') as 'linkedin' | 'company-careers' | 'hidden'),
      }))

      setDiscoveredJobs(mapped)
      addNexusActivityEntry({
        agentType: 'hunter',
        action: 'Nexus-Hunter Prime Targets Selected',
        result: `${mapped.length} Prime Targets discovered and sent to Job Discovery pipeline.`,
        impact: 'positive',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nexus-Hunter failed')
      addNexusActivityEntry({
        agentType: 'hunter',
        action: 'Nexus-Hunter Warning',
        result: err instanceof Error ? err.message : 'Unknown job discovery issue',
        impact: 'warning',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 pointer-events-auto overflow-hidden">
      <div onClick={onClose} className="absolute inset-0 bg-white/60 backdrop-blur-xl" />
      <div className="relative w-full max-w-6xl bg-white rounded-[30px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] p-6 md:p-8 border border-zinc-100 max-h-[90vh] overflow-hidden flex flex-col">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 rounded-full">
          <X size={18} />
        </button>

        <div className="mb-5">
          <h2 className="text-2xl font-black text-darkDelegation tracking-tight">Nexus-Hunter Discovery Engine</h2>
          <p className="text-xs text-zinc-500 mt-1">Crew-style market scan, hidden-fit filtering, and Blue Ocean prioritization.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Subfeature 1 - Market Scraping</p>
            <p className="text-xs text-zinc-700">Scans YC Work at a Startup, Greenhouse, Lever, and direct career pages via web API connectors.</p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Subfeature 2 - Hidden Fit Engine</p>
            <p className="text-xs text-zinc-700">Gemini reasons beyond keywords to detect deep technical fit from niche project signals and architecture choices.</p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Subfeature 3 - Blue Ocean Score</p>
            <p className="text-xs text-zinc-700">Prioritizes high-alignment links with lower applicant saturation, favoring direct application routes.</p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={runDiscovery}
            disabled={!canRun || loading}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-2"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Run Nexus-Hunter Scan
          </button>
          {error && <span className="text-[10px] text-red-600">{error}</span>}
        </div>

        <div className="flex-1 overflow-auto space-y-3 pr-1">
          {discoveredJobs.length === 0 ? (
            <div className="h-full min-h-48 border border-dashed border-zinc-200 rounded-xl flex items-center justify-center bg-zinc-50/40">
              <div className="text-center">
                <Target size={16} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-300">No prime targets discovered yet</p>
              </div>
            </div>
          ) : (
            discoveredJobs.slice(0, 3).map((job) => (
              <div key={job.id} className="rounded-xl border border-zinc-100 bg-zinc-50/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-darkDelegation">{job.title}</p>
                    <p className="text-xs text-zinc-500">{job.company}</p>
                  </div>
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-purple-700 hover:text-purple-900">
                    Apply
                    <ExternalLink size={10} />
                  </a>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-md bg-white border border-zinc-100 px-2 py-1.5">Alignment: <span className="font-black text-emerald-700">{Math.round(job.alignmentScore)}%</span></div>
                  <div className="rounded-md bg-white border border-zinc-100 px-2 py-1.5">Blue Ocean: <span className="font-black text-blue-700">{Math.round(job.blueOceanScore)}%</span></div>
                </div>
                <p className="mt-2 text-xs text-zinc-700">{job.nexusMatchReason}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
