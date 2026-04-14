import { Loader2, Github, Plus, Check, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { generateResumeBullet } from '../core/agent/resumeForge'
import { useGitHubData } from '../integration/hooks/useGitHubData'
import { useCoreStore, type ResumeForgeItem } from '../integration/store/coreStore'

type ResumeForgeStage = 'connect' | 'loading' | 'results'

interface ResumeForgeModalProps {
  onClose: () => void
}

function ProgressStrip() {
  return (
    <div className="w-full rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
        Nexus-Writer analyzing your repositories...
      </div>
      <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
        <div className="h-full w-3/4 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 animate-pulse rounded-full" />
      </div>
    </div>
  )
}

export default function ResumeForgeModal({ onClose }: ResumeForgeModalProps) {
  const {
    resumeForgeItems,
    setResumeForgeItems,
    updateResumeForgeItemBullet,
    acceptResumeForgeBullet,
    addResumeForgeToLedger,
  } = useCoreStore()

  const [stage, setStage] = useState<ResumeForgeStage>('connect')
  const [error, setError] = useState<string | null>(null)

  const { token, clearToken, connectUrl, fetchRecentActivity } = useGitHubData()

  const isConnected = useMemo(() => Boolean(token), [token])

  const runForge = async () => {
    setError(null)
    setStage('loading')

    try {
      const repos = await fetchRecentActivity()
      if (repos.length === 0) {
        throw new Error('No repositories found. Push code or check token scope.')
      }

      const generated: ResumeForgeItem[] = []
      for (const repo of repos) {
        const bullet = await generateResumeBullet(repo)
        generated.push({
          id: `rf_${repo.id}`,
          repository: repo.name,
          repositoryUrl: repo.url,
          codeSnapshot: `${repo.commits} commits, ${Math.round(repo.linesEstimate / 100) / 10}K lines ${repo.primaryLanguage}`,
          suggestedBullet: bullet,
          accepted: false,
          addedToLedger: false,
        })
      }

      setResumeForgeItems(generated)
      setStage('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resume Forge failed to process repositories.')
      setStage('connect')
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 pointer-events-auto overflow-hidden">
      <div onClick={onClose} className="absolute inset-0 bg-white/60 backdrop-blur-xl animate-in fade-in duration-500" />
      <div className="relative w-full max-w-6xl bg-white rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] p-6 md:p-8 border border-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[90vh] overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 rounded-full transition-all active:scale-95 cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-black text-darkDelegation tracking-tight">Resume Forge</h2>
          <p className="text-xs text-zinc-500 mt-1">Transform your GitHub work into quantified resume bullets via Nexus-Writer.</p>
        </div>

        {stage === 'connect' && (
          <div className="flex-1 overflow-auto space-y-4">
            <div className="rounded-2xl border border-zinc-100 p-5 bg-zinc-50/50 space-y-4">
              <button
                onClick={() => {
                  window.location.href = connectUrl
                }}
                className="inline-flex items-center gap-2 px-5 py-3 bg-darkDelegation text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-black transition-all active:scale-95"
              >
                <Github size={14} />
                Connect GitHub
              </button>

              <div className="space-y-2 max-w-md">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Connection Status</p>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${isConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-zinc-100 text-zinc-500 border border-zinc-200'}`}>
                  {isConnected ? 'GitHub Connected' : 'Not Connected'}
                </div>
                {isConnected && (
                  <button onClick={clearToken} className="block text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700">
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}

            <button
              onClick={runForge}
              disabled={!isConnected}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Start Resume Forge
            </button>
          </div>
        )}

        {stage === 'loading' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-2xl space-y-4">
              <div className="flex items-center gap-3 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                <Loader2 size={14} className="animate-spin" />
                Running Nexus-Writer Pipeline
              </div>
              <ProgressStrip />
            </div>
          </div>
        )}

        {stage === 'results' && (
          <div className="flex-1 overflow-auto pr-1 space-y-4">
            {resumeForgeItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-zinc-100 p-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Input</p>
                    <a href={item.repositoryUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-darkDelegation hover:underline">
                      {item.repository}
                    </a>
                    <div className="text-xs text-zinc-600">Code Snapshot: {item.codeSnapshot}</div>
                  </div>

                  <div className="bg-white rounded-xl border border-zinc-100 p-4 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Output</p>
                    <textarea
                      value={item.suggestedBullet}
                      onChange={(e) => updateResumeForgeItemBullet(item.id, e.target.value)}
                      className="w-full min-h-24 resize-y bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-darkDelegation/20"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => acceptResumeForgeBullet(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors"
                      >
                        <Check size={12} />
                        {item.accepted ? 'Accepted' : 'Accept'}
                      </button>
                      <button
                        onClick={() => addResumeForgeToLedger(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-zinc-200 transition-colors"
                      >
                        <Plus size={12} />
                        {item.addedToLedger ? 'Added to Ledger' : 'Add to Ledger'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
