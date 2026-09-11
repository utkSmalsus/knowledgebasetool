import { useState } from 'react'
import { useKb } from '../kb/store'
import { Feedback, FeedbackReason, FeedbackVerdict } from '../types'
import { useToast } from './Toast'
import { btn, input } from './ui'

const REASONS: { key: FeedbackReason; label: string }[] = [
  { key: 'outdated', label: 'Outdated' },
  { key: 'incorrect', label: 'Incorrect' },
  { key: 'missing_info', label: 'Missing information' },
  { key: 'broken', label: "Doesn't work anymore" },
  { key: 'duplicate', label: 'Duplicate' },
  { key: 'other', label: 'Other' },
]

export default function FeedbackWidget({ entryId, feedback }: { entryId: string; feedback: Feedback[] }) {
  const { addFeedback, currentUser } = useKb()
  const toast = useToast()
  const [verdict, setVerdict] = useState<FeedbackVerdict | null>(null)
  const [reason, setReason] = useState<FeedbackReason>('outdated')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const already = feedback.some((f) => f.by === currentUser.name)
  const yes = feedback.filter((f) => f.verdict === 'yes').length
  const total = feedback.length

  const submit = (v: FeedbackVerdict) => {
    if (v !== 'no') {
      addFeedback(entryId, { by: currentUser.name, verdict: v })
      setSubmitted(true)
      toast(v === 'yes' ? 'Thanks — marked as accurate.' : 'Thanks — marked as partially accurate.', 'success')
    } else {
      setVerdict('no')
    }
  }

  const submitNo = () => {
    addFeedback(entryId, { by: currentUser.name, verdict: 'no', reason, note: note.trim() || undefined })
    setSubmitted(true)
    toast('Thanks — this has been flagged for maintenance.', 'success')
  }

  if (already || submitted) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="font-medium">Thanks for the feedback.</p>
        {total > 0 && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {yes} of {total} people found this accurate.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm font-semibold">Is this knowledge still accurate?</p>
      {verdict !== 'no' ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={() => submit('yes')} className={btn.ghost}>
            ✓ Yes
          </button>
          <button onClick={() => submit('partial')} className={btn.ghost}>
            ⚠ Partially
          </button>
          <button onClick={() => submit('no')} className={btn.ghost}>
            ✕ No
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="block space-y-1 text-xs">
            <span className="font-semibold uppercase text-slate-400">Why?</span>
            <select value={reason} onChange={(e) => setReason(e.target.value as FeedbackReason)} className={input}>
              {REASONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything specific? (optional)"
            rows={2}
            className={input}
          />
          <div className="flex gap-2">
            <button onClick={() => setVerdict(null)} className={btn.ghost}>
              Cancel
            </button>
            <button onClick={submitNo} className={btn.primary}>
              Submit
            </button>
          </div>
        </div>
      )}
      {total > 0 && (
        <p className="mt-3 text-xs text-slate-400">
          {yes} of {total} people found this accurate.
        </p>
      )}
    </div>
  )
}
