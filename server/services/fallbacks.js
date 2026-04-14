/**
 * FILE: server/services/fallbacks.js
 * PURPOSE: Fallback/placeholder data generators for when external APIs are unavailable.
 * DEPENDENCIES: None
 * USED BY: routes/jobs.js
 */

export function fallbackPrimeTargets() {
  return [
    {
      job_title: 'Founding AI Engineer',
      company_name: 'YC Startup (Stealth)',
      application_link: 'https://www.workatastartup.com/',
      nexus_match_reason: 'Direct fit for shipping LLM-backed products end-to-end with strong ownership and execution speed.',
      alignment_score: 91,
      blue_ocean_score: 89,
      source: 'company-careers',
      competition_level: 'Low',
    },
    {
      job_title: 'Senior Applied ML Engineer',
      company_name: 'Greenhouse Portfolio Company',
      application_link: 'https://boards.greenhouse.io/',
      nexus_match_reason: 'Strong hidden fit for practical RAG workflows, model tuning, and production reliability trade-offs.',
      alignment_score: 88,
      blue_ocean_score: 86,
      source: 'company-careers',
      competition_level: 'Low',
    },
    {
      job_title: 'Staff AI Platform Engineer',
      company_name: 'Lever Hiring Team',
      application_link: 'https://jobs.lever.co/',
      nexus_match_reason: 'Matches platform engineering depth across APIs, observability, and scalable ML serving architecture.',
      alignment_score: 85,
      blue_ocean_score: 81,
      source: 'company-careers',
      competition_level: 'Medium',
    },
  ]
}
