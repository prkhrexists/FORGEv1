import type { GitHubRepoDigest } from '../../integration/hooks/useGitHubData'

export async function generateResumeBullet(repoData: GitHubRepoDigest): Promise<string> {
  const response = await fetch('/api/resume/bullet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repoData: {
        repository: repoData.name,
        commits: repoData.commits,
        pullRequests: repoData.pullRequests,
        primaryLanguage: repoData.primaryLanguage,
        linesEstimate: repoData.linesEstimate,
        latestSummary: repoData.latestSummary,
      },
    }),
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json?.error || 'Resume bullet generation failed.')
  }

  return json?.bullet || 'Engineered production features across repositories with measurable reliability and delivery improvements.'
}
