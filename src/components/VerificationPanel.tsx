import { useState } from 'react'
import { useKb } from '../kb/store'
import { VERIFICATION_META } from '../kb/schema'
import { Entry, canReview, isExpired } from '../types'
import { ReviewDialog } from './ReviewActions'
import { useToast } from './Toast'
import { Panel, btn, fmtDate, reviewDueLabel } from './ui'

export default function VerificationPanel({ entry, canManage }: { entry: Entry; canManage: boolean }) {
  const { currentUser, submitForReview } = useKb()
  const toast = useToast()
  const [reviewOpen, setReviewOpen] = useState(false)
  const v = entry.verification
  const expired = isExpired(v)
  const iAmReviewer = canReview(currentUser.role)
  const isOwner = entry.author === currentUser.name || currentUser.role === 'admin'
  const recentHistory = [...v.history].reverse().slice(0, 3)
  const checkCount = v.checks ? Number(v.checks.contentReviewed) + Number(v.checks.evidenceChecked) + Number(v.checks.approachValidated) : 0

  const submit = () => {
    submitForReview(entry.id, entry.reviewer)
    toast('Submitted for review.', 'success')
  }

  const meta = VERIFICATION_META[expired ? 'needs_update' : v.state]

  return (
    // The big trust badge already sits at the top of the article — this panel is the "why", not a second badge.
    <Panel title={`Verification — ${expired ? 'Verification expired' : meta.label}`} hint={meta.description}>
      <div className="space-y-3 p-4 text-sm">
        {(v.state === 'verified' || v.state === 'partially_verified') && (
          <dl className="space-y-1.5 text-xs">
            {v.checks && (
              <div className="pb-1.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{checkCount}/3 checks complete</span>
                </div>
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${checkCount === 3 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${(checkCount / 3) * 100}%` }}
                  />
                </div>
                <CheckLine label="Content reviewed" ok={v.checks.contentReviewed} />
                <CheckLine label="Evidence checked" ok={v.checks.evidenceChecked} />
                <CheckLine label="Technical approach validated" ok={v.checks.approachValidated} />
              </div>
            )}
            <Row label="Verified by" value={v.verifiedBy} />
            <Row label="Last verified" value={v.verifiedAt ? fmtDate(v.verifiedAt) : undefined} />
            <Row
              label="Next review"
              value={v.nextReviewAt ? `${fmtDate(v.nextReviewAt)} (${reviewDueLabel(v.nextReviewAt)})` : 'No scheduled re-review'}
              warn={expired}
            />
          </dl>
        )}

        {expired && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            ⚠ Verification expired — this knowledge may no longer reflect the current system.
          </div>
        )}

        {v.state === 'unverified' &&
          (recentHistory[0]?.action === 'changes_requested' || recentHistory[0]?.action === 'rejected' ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <span className="font-medium">{recentHistory[0].by}</span> {recentHistory[0].action === 'rejected' ? 'rejected this' : 'requested changes'}
              {recentHistory[0].note && <> — &ldquo;{recentHistory[0].note}&rdquo;</>}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              ⚠ This knowledge has not been verified yet.
            </div>
          ))}

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
                  {h.note && <div className="mt-0.5 text-slate-500 dark:text-slate-400">&ldquo;{h.note}&rdquo;</div>}
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
