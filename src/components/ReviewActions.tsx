import { useEffect, useState } from 'react'
import { useKb } from '../kb/store'
import { REVIEW_INTERVALS, Visibility, VerificationChecks } from '../types'
import { useToast } from './Toast'
import { EvidenceRow, Modal, btn, fmtDate, input } from './ui'

const emptyChecks: VerificationChecks = { contentReviewed: false, evidenceChecked: false, approachValidated: false }

const approveBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40'

/**
 * The Approve / Request changes / Reject dialog. Shared by the entry detail
 * page and the review queue so the workflow behaves identically everywhere.
 */
export function ReviewDialog({ entryId, title, open, onClose }: { entryId: string; title: string; open: boolean; onClose: () => void }) {
  const { approve, requestChanges, reject, entries } = useKb()
  const entry = entries.find((e) => e.id === entryId)
  const toast = useToast()
  const [mode, setMode] = useState<'approve' | 'changes' | 'reject'>('approve')
  const [checks, setChecks] = useState<VerificationChecks>(emptyChecks)
  const [interval, setInterval_] = useState('90d')
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('internal')

  // re-sync to the entry's actual visibility every time the dialog opens, since
  // this component can stay mounted across different entries (see VerificationPanel)
  useEffect(() => {
    if (open) setVisibility(entry?.visibility ?? 'internal')
  }, [open, entry?.visibility])

  const close = () => {
    setMode('approve')
    setChecks(emptyChecks)
    setNote('')
    onClose()
  }

  const days = REVIEW_INTERVALS.find((r) => r.key === interval)?.days

  const submit = () => {
    if (mode === 'approve') {
      approve(entryId, { checks, reviewIntervalDays: days, note: note.trim() || undefined, visibility })
      const allChecked = checks.contentReviewed && checks.evidenceChecked && checks.approachValidated
      toast(allChecked ? '✓ Verified' : '◑ Partially verified', 'success')
    } else if (mode === 'changes') {
      if (!note.trim()) return
      requestChanges(entryId, note.trim())
      toast('Changes requested — sent back to the author.', 'default')
    } else {
      if (!note.trim()) return
      reject(entryId, note.trim())
      toast('Entry rejected.', 'default')
    }
    close()
  }

  return (
    <Modal open={open} onClose={close} labelledBy="review-title">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 id="review-title" className="text-base font-semibold">
          Review &ldquo;{title}&rdquo;
        </h2>
        {entry && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            By {entry.author} · submitted {entry.verification.submittedAt ? fmtDate(entry.verification.submittedAt) : '—'} ·{' '}
            {entry.evidence.length} evidence item{entry.evidence.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {entry && entry.evidence.length > 0 && (
        <div className="space-y-1.5 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          {entry.evidence.slice(0, 3).map((e) => (
            <EvidenceRow key={e.id} e={e} />
          ))}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200 px-5 pt-3 dark:border-slate-800">
        {(
          [
            ['approve', 'Approve'],
            ['changes', 'Request changes'],
            ['reject', 'Reject'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
              mode === key
                ? 'border-b-2 border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-5">
        {mode === 'approve' && (
          <>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-400">Verification checklist</p>
              {(
                [
                  ['contentReviewed', 'Content reviewed'],
                  ['evidenceChecked', 'Evidence checked'],
                  ['approachValidated', 'Technical approach validated'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checks[key]}
                    onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
              <p className="text-xs text-slate-400">
                All three checked → <span className="font-medium text-emerald-600 dark:text-emerald-400">Verified</span>. Some checked →{' '}
                <span className="font-medium text-amber-600 dark:text-amber-400">Partially verified</span>.
              </p>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase text-slate-400">Next review in</span>
              <select value={interval} onChange={(e) => setInterval_(e.target.value)} className={input}>
                {REVIEW_INTERVALS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-2.5 text-sm dark:border-slate-800">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={visibility === 'client'}
                onChange={(e) => setVisibility(e.target.checked ? 'client' : 'internal')}
              />
              <span>
                Visible to clients
                <span className="block text-xs font-normal text-slate-400">
                  Sets this entry's visibility on approval — it still also needs to be Published to actually show up for client accounts.
                </span>
              </span>
            </label>
          </>
        )}

        {(mode === 'changes' || mode === 'reject') && (
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-slate-400">
              {mode === 'changes' ? 'What needs to change?' : 'Why is this being rejected?'}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={mode === 'changes' ? 'e.g. Please add benchmark results before approval.' : ''}
              className={input}
              autoFocus
            />
          </label>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
        <button onClick={close} className={btn.ghost}>
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={mode !== 'approve' && !note.trim()}
          className={mode === 'reject' ? btn.danger : mode === 'approve' ? approveBtn : btn.primary}
        >
          {mode === 'approve' ? 'Submit review' : mode === 'changes' ? 'Request changes' : 'Reject'}
        </button>
      </div>
    </Modal>
  )
}
