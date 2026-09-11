import { useState } from 'react'
import { useKb } from '../kb/store'
import { Entry, canReview, isExpired } from '../types'
import { ReviewDialog } from './ReviewActions'
import { useToast } from './Toast'
import { Panel, VerificationBadge, btn, fmtDate, reviewDueLabel } from './ui'

export default function VerificationPanel({ entry, canManage }: { entry: Entry; canManage: boolean }) {
  const { currentUser, submitForReview } = useKb()
  const toast = useToast()
  const [reviewOpen, setReviewOpen] = useState(false)
  const v = entry.verification
  const expired = isExpired(v)
  const iAmReviewer = canReview(currentUser.role)
  const isOwner = entry.author === currentUser.name || currentUser.role === 'admin'
  const recentHistory = [...v.history].reverse().slice(0, 3)

  const submit = () => {
    submitForReview(entry.id, entry.reviewer)
    toast('Submitted for review.', 'success')
  }

  return (
    <Panel title="Verification">
      <div className="space-y-3 p-4 text-sm">
        <VerificationBadge entry={entry} />

        {(v.state === 'verified' || v.state === 'partially_verified') && (
          <dl className="space-y-1.5 text-xs">
            <Row label="Verified by" value={v.verifiedBy} />
            <Row label="Last verified" value={v.verifiedAt ? fmtDate(v.verifiedAt) : undefined} />
            <Row
              label="Next review"
              value={v.nextReviewAt ? `${fmtDate(v.nextReviewAt)} (${reviewDueLabel(v.nextReviewAt)})` : 'No scheduled re-review'}
              warn={expired}
            />
            {v.checks && (
              <div className="pt-1.5">
                <CheckLine label="Content reviewed" ok={v.checks.contentReviewed} />
                <CheckLine label="Evidence checked" ok={v.checks.evidenceChecked} />
                <CheckLine label="Technical approach validated" ok={v.checks.approachValidated} />
              </div>
            )}
          </dl>
        )}

        {expired && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            ⚠ Verification expired — this knowledge may no longer reflect the current system.
          </div>
        )}

        {v.state === 'unverified' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            ⚠ This knowledge has not been verified yet.
          </div>
        )}

        {v.state === 'in_review' && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            Submitted {v.submittedAt ? fmtDate(v.submittedAt) : ''}
            {v.reviewer ? ` — waiting on ${v.reviewer}` : ' — waiting for a reviewer'}.
          </div>
        )}

        {v.state === 'needs_update' && recentHistory[0]?.note && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            &ldquo;{recentHistory[0].note}&rdquo; — {recentHistory[0].by}
          </div>
        )}

        {/* actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {v.state === 'in_review' && iAmReviewer && (
            <button onClick={() => setReviewOpen(true)} className={btn.primary}>
              Review now
            </button>
          )}
          {v.state !== 'in_review' && v.state !== 'deprecated' && (canManage || isOwner || iAmReviewer) && (
            <button onClick={submit} className={btn.ghost}>
              {entry.author === currentUser.name ? 'Submit for review' : 'Request review'}
            </button>
          )}
        </div>

        {recentHistory.length > 0 && (
          <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
            <p className="mb-1 text-[11px] font-semibold uppercase text-slate-400">Recent activity</p>
            <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {recentHistory.map((h) => (
                <li key={h.id}>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{h.by}</span> {actionVerb(h.action)}{' '}
                  <span className="text-slate-400">{fmtDate(h.at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ReviewDialog entryId={entry.id} title={entry.title} open={reviewOpen} onClose={() => setReviewOpen(false)} />
    </Panel>
  )
}

function actionVerb(action: string) {
  const map: Record<string, string> = {
    submitted: 'submitted this for review',
    approved: 'verified this',
    partially_approved: 'partially verified this',
    changes_requested: 'requested changes',
    rejected: 'rejected this',
    marked_needs_update: 'flagged this as needing an update',
    deprecated: 'deprecated this',
  }
  return map[action] ?? action
}

function Row({ label, value, warn }: { label: string; value?: string; warn?: boolean }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-right font-medium ${warn ? 'text-amber-600 dark:text-amber-400' : ''}`}>{value}</dd>
    </div>
  )
}

function CheckLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 py-0.5 ${ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
      <span aria-hidden>{ok ? '✓' : '○'}</span>
      {label}
    </div>
  )
}
