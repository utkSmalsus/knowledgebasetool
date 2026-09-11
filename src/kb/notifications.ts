import { Entry, User, isExpired } from '../types'

export interface Notice {
  id: string
  tone: 'success' | 'warning' | 'info'
  icon: string
  text: string
  entryId: string
  entryTitle: string
  at: string
}

/**
 * Every notice here is derived straight from real entry state for the current
 * user — nothing is a fabricated feed. Read state is tracked by id in the
 * store (isNoticeRead/markNoticeRead) so a notice, once seen, stays seen.
 */
export function deriveNotifications(entries: Entry[], me: User, now = Date.now()): Notice[] {
  const out: Notice[] = []
  const mine = (e: Entry) => e.author === me.name

  for (const e of entries) {
    const last = e.verification.history[e.verification.history.length - 1]

    if (mine(e) && last && (last.action === 'approved' || last.action === 'partially_approved') && last.by !== me.name) {
      out.push({
        id: `approved:${e.id}:${last.id}`,
        tone: 'success',
        icon: '✓',
        text: `${last.by} ${last.action === 'approved' ? 'verified' : 'partially verified'} "${e.title}"`,
        entryId: e.id,
        entryTitle: e.title,
        at: last.at,
      })
    }

    if (mine(e) && last && (last.action === 'changes_requested' || last.action === 'rejected')) {
      out.push({
        id: `changes:${e.id}:${last.id}`,
        tone: 'warning',
        icon: '⚠',
        text: `${last.by} ${last.action === 'rejected' ? 'rejected' : 'requested changes on'} "${e.title}"${last.note ? ` — ${last.note}` : ''}`,
        entryId: e.id,
        entryTitle: e.title,
        at: last.at,
      })
    }

    if (mine(e) && e.verification.state === 'needs_update' && last) {
      out.push({
        id: `needsupdate:${e.id}`,
        tone: 'warning',
        icon: '⚠',
        text: `"${e.title}" was flagged as needing an update`,
        entryId: e.id,
        entryTitle: e.title,
        at: last.at,
      })
    }

    if (mine(e) && isExpired(e.verification, now)) {
      out.push({
        id: `expired:${e.id}`,
        tone: 'warning',
        icon: '⚠',
        text: `"${e.title}" needs re-verification — its scheduled review date has passed`,
        entryId: e.id,
        entryTitle: e.title,
        at: e.verification.nextReviewAt!,
      })
    } else if (mine(e) && e.verification.nextReviewAt) {
      const daysLeft = Math.ceil((new Date(e.verification.nextReviewAt).getTime() - now) / 86400000)
      if (daysLeft >= 0 && daysLeft <= 7) {
        out.push({
          id: `expiring:${e.id}`,
          tone: 'info',
          icon: '⏳',
          text: `"${e.title}" needs verification in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          entryId: e.id,
          entryTitle: e.title,
          at: e.verification.nextReviewAt,
        })
      }
    }

    const badFeedback = [...e.feedback].reverse().find((f) => f.verdict === 'no')
    if (mine(e) && badFeedback) {
      out.push({
        id: `feedback:${e.id}:${badFeedback.id}`,
        tone: 'warning',
        icon: '⚠',
        text: `"${e.title}" was reported as ${badFeedback.reason?.replace('_', ' ') ?? 'inaccurate'} by ${badFeedback.by}`,
        entryId: e.id,
        entryTitle: e.title,
        at: badFeedback.createdAt,
      })
    }

    if (e.verification.state === 'in_review' && e.verification.reviewer === me.name) {
      out.push({
        id: `assigned:${e.id}`,
        tone: 'info',
        icon: '🔍',
        text: `${e.author} submitted "${e.title}" for your review`,
        entryId: e.id,
        entryTitle: e.title,
        at: e.verification.submittedAt ?? e.updatedAt,
      })
    }
  }

  return out.sort((a, b) => b.at.localeCompare(a.at))
}
