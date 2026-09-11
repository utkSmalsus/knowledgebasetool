import { useState } from 'react'
import { useKb } from '../kb/store'
import { REVIEW_INTERVALS, VerificationChecks } from '../types'
import { useToast } from './Toast'
import { Modal, btn, input } from './ui'

const emptyChecks: VerificationChecks = { contentReviewed: false, evidenceChecked: false, approachValidated: false }

/**
 * The Approve / Request changes / Reject dialog. Shared by the entry detail
 * page and the review queue so the workflow behaves identically everywhere.
 */
export function ReviewDialog({ entryId, title, open, onClose }: { entryId: string; title: string; open: boolean; onClose: () => void }) {
  const { approve, requestChanges, reject } = useKb()
  const toast = useToast()
  const [mode, setMode] = useState<'approve' | 'changes' | 'reject'>('approve')
  const [checks, setChecks] = useState<VerificationChecks>(emptyChecks)
  const [interval, setInterval_] = useState('90d')
  const [note, setNote] = useState('')

  const close = () => {
    setMode('approve')
    setChecks(emptyChecks)
    setNote('')
    onClose()
  }

  const days = REVIEW_INTERVALS.find((r) => r.key === interval)?.days

  const submit = () => {
    if (mode === 'approve') {
      approve(entryId, { checks, reviewIntervalDays: days, note: note.trim() || undefined })
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
      </div>

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
          className={mode === 'reject' ? btn.danger : btn.primary}
        >
          {mode === 'approve' ? 'Submit review' : mode === 'changes' ? 'Request changes' : 'Reject'}
        </button>
      </div>
    </Modal>
  )
}
