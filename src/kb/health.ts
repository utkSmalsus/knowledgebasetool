import { Entry, isExpired } from '../types'

export interface HealthComponent {
  label: string
  pct: number | null // null = not enough data to compute
  weight: number
  detail: string
}

export interface Health {
  total: number
  verified: number
  underReview: number
  needsUpdate: number
  partiallyVerified: number
  deprecated: number
  drafts: number
  expired: number
  withoutReviewer: number
  components: HealthComponent[]
  score: number | null
}

/**
 * Everything here is a plain count or ratio over real entries — no ML, no
 * hidden weighting beyond what's shown. If a component has no data yet
 * (e.g. nobody has left feedback), it's excluded from the score rather than
 * assumed to be 100% or 0%.
 */
export function computeHealth(entries: Entry[]): Health {
  const total = entries.length || 1 // guard div/0 for an empty KB
  const verified = entries.filter((e) => e.verification.state === 'verified').length
  const partiallyVerified = entries.filter((e) => e.verification.state === 'partially_verified').length
  const underReview = entries.filter((e) => e.verification.state === 'in_review').length
  const needsUpdate = entries.filter((e) => e.verification.state === 'needs_update').length
  const deprecated = entries.filter((e) => e.verification.state === 'deprecated').length
  const drafts = entries.filter((e) => e.status === 'draft').length
  const expired = entries.filter((e) => isExpired(e.verification)).length
  const withoutReviewer = entries.filter((e) => !e.reviewer && e.verification.state !== 'verified').length

  const scheduled = entries.filter((e) => e.verification.nextReviewAt)
  const evidenced = entries.filter((e) => e.evidence.length > 0)
  const feedbackTotal = entries.reduce((n, e) => n + e.feedback.length, 0)
  const feedbackYes = entries.reduce((n, e) => n + e.feedback.filter((f) => f.verdict === 'yes').length, 0)

  const components: HealthComponent[] = [
    {
      label: 'Verification coverage',
      pct: Math.round(((verified + partiallyVerified * 0.5) / total) * 100),
      weight: 35,
      detail: `${verified} of ${entries.length} entries fully verified`,
    },
    {
      label: 'Freshness',
      pct: scheduled.length ? Math.round(((scheduled.length - expired) / scheduled.length) * 100) : null,
      weight: 25,
      detail: scheduled.length ? `${expired} of ${scheduled.length} scheduled reviews overdue` : 'No entries have a review schedule yet',
    },
    {
      label: 'Evidence coverage',
      pct: Math.round((evidenced.length / total) * 100),
      weight: 20,
      detail: `${evidenced.length} of ${entries.length} entries have at least one evidence item`,
    },
    {
      label: 'Feedback positivity',
      pct: feedbackTotal ? Math.round((feedbackYes / feedbackTotal) * 100) : null,
      weight: 20,
      detail: feedbackTotal ? `${feedbackYes} of ${feedbackTotal} feedback responses said "still accurate"` : 'No feedback submitted yet',
    },
  ]

  const scored = components.filter((c) => c.pct !== null) as (HealthComponent & { pct: number })[]
  const weightSum = scored.reduce((n, c) => n + c.weight, 0)
  const score = weightSum > 0 ? Math.round(scored.reduce((n, c) => n + c.pct * c.weight, 0) / weightSum) : null

  return {
    total: entries.length,
    verified,
    underReview,
    needsUpdate,
    partiallyVerified,
    deprecated,
    drafts,
    expired,
    withoutReviewer,
    components,
    score,
  }
}
