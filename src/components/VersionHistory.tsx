import { useState } from 'react'
import { diffSnapshots } from '../kb/diff'
import { useKb } from '../kb/store'
import { Version } from '../types'
import { fmtDate } from './ui'

export default function VersionHistory({ entryId, versions }: { entryId: string; versions: Version[] }) {
  const { revert } = useKb()
  const [compareId, setCompareId] = useState<string | null>(null)
  const ordered = [...versions].reverse()

  return (
    <ul className="space-y-1 p-4">
      {ordered.map((v, i) => {
        const prev = ordered[i + 1] // one step older, since list is newest-first
        const isLatest = v.id === versions[versions.length - 1].id
        const comparing = compareId === v.id
        return (
          <li key={v.id} className="rounded-lg border border-transparent text-xs hover:border-slate-100 dark:hover:border-slate-800">
            <div className="flex items-center justify-between gap-2 py-1.5">
              <span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{v.editedBy}</span>{' '}
                <span className="text-slate-400">{fmtDate(v.editedAt)}</span>
              </span>
              <div className="flex shrink-0 gap-2">
                {prev && (
                  <button
                    onClick={() => setCompareId(comparing ? null : v.id)}
                    className="text-slate-400 hover:text-slate-900 hover:underline dark:hover:text-slate-100"
                  >
                    {comparing ? 'Hide diff' : 'Compare'}
                  </button>
                )}
                {!isLatest && (
                  <button
                    onClick={() => confirm('Revert to this version?') && revert(entryId, v.id)}
                    className="text-slate-400 hover:text-slate-900 hover:underline dark:hover:text-slate-100"
                  >
                    Revert
                  </button>
                )}
              </div>
            </div>
            <div className="pb-1.5 text-slate-500 dark:text-slate-400">{v.summary}</div>
            {comparing && prev && <DiffTable before={prev.snapshot} after={v.snapshot} />}
          </li>
        )
      })}
    </ul>
  )
}

function DiffTable({ before, after }: { before: Version['snapshot']; after: Version['snapshot'] }) {
  const diffs = diffSnapshots(before, after)
  if (diffs.length === 0) return <p className="mb-2 text-slate-400">No field-level changes recorded.</p>

  return (
    <div className="mb-3 space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
      {diffs.map((d) => (
        <div key={d.label}>
          <div className="font-semibold text-slate-500 dark:text-slate-400">{d.label}</div>
          <div className="mt-0.5 grid grid-cols-2 gap-2">
            <div className="truncate rounded bg-rose-50 px-1.5 py-1 text-rose-700 line-through dark:bg-rose-950/40 dark:text-rose-300">
              {d.before || '—'}
            </div>
            <div className="truncate rounded bg-emerald-50 px-1.5 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {d.after || '—'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
