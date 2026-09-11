import { Entry, isExpired } from '../types'

const daysSince = (iso?: string, now = Date.now()) =>
  iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : Infinity

/**
 * A knowledge base rots quietly. This surfaces the entries that need a human:
 * flagged or expired verification, stalled research, old drafts. Driven by
 * the real Verification system and Research's own stage — not by ad hoc
 * per-type proxies, so it works the same for every type in the taxonomy.
 */
export function needsAttention(entries: Entry[], now = Date.now()): { entry: Entry; reason: string }[] {
  const out: { entry: Entry; reason: string }[] = []

  for (const e of entries) {
    if (e.status === 'archived') continue

    if (e.verification.state === 'needs_update') {
      out.push({ entry: e, reason: 'Flagged as needing an update' })
    } else if (isExpired(e.verification, now)) {
      out.push({ entry: e, reason: 'Verification expired — due for re-review' })
    }

    if ((e.type === 'research' || e.type === 'ai_research') && e.stage === 'in_progress' && daysSince(e.updatedAt, now) > 45) {
      out.push({ entry: e, reason: `Research stalled — no update in ${daysSince(e.updatedAt, now)} days` })
    }

    if (e.status === 'draft' && daysSince(e.updatedAt, now) > 30) {
      out.push({ entry: e, reason: `Draft untouched for ${daysSince(e.updatedAt, now)} days` })
    }
  }

  // one row per entry, first reason wins
  const seen = new Set<string>()
  return out.filter(({ entry }) => !seen.has(entry.id) && seen.add(entry.id))
}
