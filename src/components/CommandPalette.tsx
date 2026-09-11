import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { score } from '../kb/search'
import { useKb } from '../kb/store'
import { Entry, canEdit, canReview } from '../types'
import { Modal, Monogram, VerificationBadge } from './ui'

interface Action {
  id: string
  label: string
  hint?: string
  icon: string
  run: () => void
  show: boolean
}

type Row = { kind: 'action'; action: Action } | { kind: 'entry'; entry: Entry } | { kind: 'search'; q: string }

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { visible, currentUser } = useKb()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setActive(0)
    const t = window.setTimeout(() => inputRef.current?.focus(), 10)
    return () => window.clearTimeout(t)
  }, [open])

  const go = (path: string) => {
    onClose()
    navigate(path)
  }

  const actions: Action[] = [
    { id: 'create', label: 'Create knowledge', hint: 'Guided flow', icon: '➕', run: () => go('/new'), show: canEdit(currentUser.role) },
    {
      id: 'drafts',
      label: 'Open your drafts',
      icon: '📝',
      run: () => go(`/browse?status=draft&author=${encodeURIComponent(currentUser.name)}`),
      show: canEdit(currentUser.role),
    },
    { id: 'review', label: 'Review queue', hint: 'Waiting for your review', icon: '🔍', run: () => go('/review'), show: canReview(currentUser.role) },
    { id: 'saved', label: 'Saved knowledge', icon: '🔖', run: () => go('/saved'), show: true },
    { id: 'experts', label: 'Find an expert', icon: '🧑‍💻', run: () => go('/experts'), show: true },
    { id: 'browse', label: 'Browse everything', icon: '🗂️', run: () => go('/browse'), show: true },
    { id: 'settings', label: 'Admin settings', icon: '⚙️', run: () => go('/admin'), show: currentUser.role === 'admin' },
  ].filter((a) => a.show)

  const filteredActions = q.trim() ? actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase())) : actions

  const entryResults = useMemo(() => {
    if (!q.trim()) return []
    return visible
      .map((e) => ({ e, s: score(e, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map((x) => x.e)
  }, [q, visible])

  const rows: Row[] = q.trim()
    ? [
        ...entryResults.map((entry): Row => ({ kind: 'entry', entry })),
        ...filteredActions.map((action): Row => ({ kind: 'action', action })),
        { kind: 'search', q },
      ]
    : actions.map((action): Row => ({ kind: 'action', action }))

  const runRow = (row: Row) => {
    if (row.kind === 'action') row.action.run()
    else if (row.kind === 'entry') go(`/entry/${row.entry.id}`)
    else go(`/browse?q=${encodeURIComponent(row.q)}`)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, rows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (rows[active]) runRow(rows[active])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} align="top" labelledBy="cmdk-input">
      <div onKeyDown={onKeyDown} role="combobox" aria-expanded aria-owns="cmdk-list" aria-haspopup="listbox">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <span aria-hidden className="text-slate-400">
            ⌘
          </span>
          <input
            ref={inputRef}
            id="cmdk-input"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setActive(0)
            }}
            placeholder="Search knowledge, or jump to a page…"
            aria-label="Command palette"
            autoComplete="off"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <span className="hidden shrink-0 text-xs text-slate-400 sm:block">Esc to close</span>
        </div>
        <div id="cmdk-list" role="listbox" className="max-h-96 overflow-y-auto py-2">
          {rows.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No matches.</p>}
          {rows.map((row, i) => {
            const key = row.kind === 'action' ? row.action.id : row.kind === 'entry' ? row.entry.id : 'search-row'
            return (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => runRow(row)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                  i === active ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''
                }`}
              >
                {row.kind === 'action' && (
                  <>
                    <span className="w-5 shrink-0 text-center" aria-hidden>
                      {row.action.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{row.action.label}</span>
                    {row.action.hint && <span className="shrink-0 text-xs text-slate-400">{row.action.hint}</span>}
                  </>
                )}
                {row.kind === 'entry' && (
                  <>
                    <Monogram type={row.entry.type} size="sm" />
                    <span className="min-w-0 flex-1 truncate">{row.entry.title}</span>
                    <VerificationBadge entry={row.entry} size="sm" />
                  </>
                )}
                {row.kind === 'search' && (
                  <>
                    <span className="w-5 shrink-0 text-center" aria-hidden>
                      🔎
                    </span>
                    <span className="flex-1 truncate">
                      Search everywhere for <span className="font-medium">&ldquo;{row.q}&rdquo;</span>
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
