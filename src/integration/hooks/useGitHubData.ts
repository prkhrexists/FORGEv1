import { useCallback, useEffect, useMemo, useState } from 'react'

export interface GitHubRepoDigest {
  id: string
  name: string
  url: string
  commits: number
  pullRequests: number
  primaryLanguage: string
  linesEstimate: number
  latestSummary: string
}

interface UseGitHubDataResult {
  token: string | null
  setToken: (token: string) => void
  clearToken: () => void
  isLoading: boolean
  error: string | null
  repos: GitHubRepoDigest[]
  connectUrl: string
  fetchRecentActivity: () => Promise<GitHubRepoDigest[]>
}

const STORAGE_KEY = 'forge-github-token'

export function useGitHubData(): UseGitHubDataResult {
  const [token, setTokenState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [repos, setRepos] = useState<GitHubRepoDigest[]>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = params.get('github_token')
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('access_token')
    const incoming = fromQuery || fromHash
    if (!incoming) return

    setTokenState(incoming)
    try {
      localStorage.setItem(STORAGE_KEY, incoming)
    } catch {
      // Ignore storage failures.
    }

    const clean = new URL(window.location.href)
    clean.searchParams.delete('github_token')
    window.history.replaceState({}, '', clean.toString())
  }, [])

  const setToken = useCallback((nextToken: string) => {
    const normalized = nextToken.trim()
    setTokenState(normalized)
    try {
      localStorage.setItem(STORAGE_KEY, normalized)
    } catch {
      // Ignore storage failures in private contexts.
    }
  }, [])

  const clearToken = useCallback(() => {
    setTokenState(null)
    setRepos([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage failures in private contexts.
    }
  }, [])

  const connectUrl = useMemo(() => {
    return '/api/github/oauth/start'
  }, [])

  const fetchRecentActivity = useCallback(async () => {
    if (!token) {
      setError('Connect GitHub first to fetch repository activity.')
      return []
    }

    setIsLoading(true)
    setError(null)

    try {
      const userReposRes = await fetch('/api/github/repos', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      if (!userReposRes.ok) {
        throw new Error(`GitHub API request failed (${userReposRes.status}).`)
      }

      const payload = (await userReposRes.json()) as { repos: GitHubRepoDigest[] }
      const enriched = payload.repos || []

      setRepos(enriched)
      return enriched
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch GitHub activity.')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [token])

  return {
    token,
    setToken,
    clearToken,
    isLoading,
    error,
    repos,
    connectUrl,
    fetchRecentActivity,
  }
}
