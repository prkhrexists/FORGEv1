/**
 * FILE: server/services/serper.js
 * PURPOSE: Serper.dev search API client for job discovery.
 * DEPENDENCIES: None
 * USED BY: routes/jobs.js
 */

export async function serperSearchJobs({ query, apiKey }) {
  if (!apiKey) return []
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: query, num: 10 }),
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json?.message || `Serper search failed (${response.status})`)
  }

  return Array.isArray(json?.organic) ? json.organic : []
}
