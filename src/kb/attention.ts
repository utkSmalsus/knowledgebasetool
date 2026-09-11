import { Entry } from '../types'

const daysSince = (iso?: string, now = Date.now()) =>
  iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : Infinity

/**
 * A knowledge base rots quietly. This surfaces the entries that need a human:
 * unverified runbooks, unfinished handovers, research that stalled, old drafts.
 */
export function needsAttention(entries: Entry[], now = Date.now()): { entry: Entry; reason: string }[] {
  const out: { entry: Entry; reason: string }[] = []

  for (const e of entries) {
    if (e.status === 'archived') continue

    if (e.type === 'howto') {
      const verified = daysSince(e.details.lastVerified as string | undefined, now)
      if (e.stage === 'stale') out.push({ entry: e, reason: 'Runbook marked needs review' })
      else if (verified > 180) out.push({ entry: e, reason: 'Runbook not verified in 6+ months' })
    }

    if (e.type === 'kt' && (e.stage === 'scheduled' || e.stage === 'in_progress')) {
      out.push({ entry: e, reason: 'Handover not finished' })
    }

    if (e.type === 'research' && e.stage === 'in_progress' && daysSince(e.updatedAt, now) > 45) {
      out.push({ entry: e, reason: `Research stalled — no update in ${daysSince(e.updatedAt, now)} days` })
    }

    if (e.type === 'postmortem' && e.stage === 'actions_open') {
      out.push({ entry: e, reason: 'Incident action items still open' })
    }

    if (e.status === 'draft' && daysSince(e.updatedAt, now) > 30) {
      out.push({ entry: e, reason: `Draft untouched for ${daysSince(e.updatedAt, now)} days` })
    }
  }

  // one row per entry, first reason wins
  const seen = new Set<string>()
  return out.filter(({ entry }) => !seen.has(entry.id) && seen.add(entry.id))
}
