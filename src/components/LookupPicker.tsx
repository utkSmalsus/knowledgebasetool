import { useEffect, useMemo, useRef, useState } from 'react'
import { input } from './ui'

export interface LookupItem {
  id: string
  title: string
  subtitle?: string
  /** Set when the result is a tree (see MasterTaskLookupResult) — enables indentation and collapse. */
  depth?: number
  parentId?: string
  hasChildren?: boolean
}

export interface LookupColumn<T> {
  label: string
  render: (item: T) => React.ReactNode
}

/**
 * A search-and-select popup for picking real item(s) from SharePoint (Portfolio/Project from
 * Master Tasks, Task across the per-team task lists, people from Task Users) — the same
 * table-of-results, click-a-row pattern the Meeting tool's Select Portfolio/Select
 * Project/Add Existing Task/attendee popups use, reimplemented against this app's own
 * plain-Tailwind UI instead of porting its Fluent UI / tanstack-table machinery (no
 * per-column filters or Compare/Add Structure).
 *
 * Single-select (pass `onSelect`): click a row to pick it and close, e.g. Portfolio/Project/Task.
 * Multi-select (pass `onToggle` + `isSelected`): click a row to toggle it, popup stays open with
 * a Done button — e.g. tagging several people on an entry.
 *
 * Results with `depth`/`parentId`/`hasChildren` (the Master Tasks hierarchy) render as a
 * collapsible tree — collapsed by default, one expand arrow per parent, same as the Meeting
 * tool's own Select Portfolio/Select Project popups.
 */
export default function LookupPicker<T extends LookupItem>({
  title,
  placeholder = 'Search…',
  subtitleLabel = 'Type',
  leadingColumn,
  columns,
  search,
  onSelect,
  onToggle,
  isSelected,
  onClose,
}: {
  title: string
  placeholder?: string
  /** Header for the subtitle column (e.g. "Type" for Portfolio/Project, "List" for Task). */
  subtitleLabel?: string
  /** One column shown before Title (e.g. the item's ID/code) — matches the real tool's column order. */
  leadingColumn?: LookupColumn<T>
  /** Extra columns shown after Title/subtitle — e.g. Due date, % complete. */
  columns?: LookupColumn<T>[]
  search: (query: string) => Promise<T[]>
  /** Single-select: picking a row selects it and closes the popup. */
  onSelect?: (item: T) => void
  /** Multi-select: picking a row toggles it; popup stays open. Pair with `isSelected`. */
  onToggle?: (item: T) => void
  isSelected?: (item: T) => boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const multiSelect = !!onToggle

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // No debounce on the initial (empty-query) load — show the full list right away, same as the Meeting tool.
    const t = setTimeout(
      () => {
        search(query.trim())
          .then((r) => {
            if (!cancelled) {
              setResults(r)
              setError('')
              // Collapsed by default — only top-level rows show until expanded, same as the Meeting tool.
              setCollapsed(new Set(r.filter((item) => item.hasChildren).map((item) => item.id)))
            }
          })
          .catch((e) => {
            if (!cancelled) setError(e instanceof Error ? e.message : 'Search failed.')
          })
          .finally(() => {
            if (!cancelled) setLoading(false)
          })
      },
      query ? 300 : 0,
    )
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, search])

  const byId = useMemo(() => new Map(results.map((r) => [r.id, r])), [results])

  const isVisible = (item: T): boolean => {
    let current = item
    while (current.parentId) {
      if (collapsed.has(current.parentId)) return false
      const parent = byId.get(current.parentId)
      if (!parent) break
      current = parent
    }
    return true
  }

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visibleResults = results.filter(isVisible)

  const rowClick = (item: T) => {
    if (multiSelect) {
      onToggle?.(item)
    } else {
      onSelect?.(item)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 pt-20" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">{title}</p>
            <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              Close
            </button>
          </div>
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className={input} />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && results.length === 0 && <p className="p-4 text-xs text-slate-400">Loading…</p>}
          {error && <p className="p-4 text-xs text-rose-600">{error}</p>}
          {!loading && !error && results.length === 0 && <p className="p-4 text-xs text-slate-400">No matches.</p>}
          {results.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  {multiSelect && <th className="w-8 px-4 py-2" />}
                  {leadingColumn && (
                    <th className="px-4 py-2 font-semibold">{leadingColumn.label}</th>
                  )}
                  <th className="px-4 py-2 font-semibold">Title</th>
                  <th className="px-4 py-2 font-semibold">{subtitleLabel}</th>
                  {columns?.map((c) => (
                    <th key={c.label} className="px-4 py-2 font-semibold">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleResults.map((r) => {
                  const checked = !!isSelected?.(r)
                  const depth = r.depth ?? 0
                  const expanded = r.hasChildren && !collapsed.has(r.id)
                  return (
                    <tr
                      key={r.id}
                      onClick={() => rowClick(r)}
                      className={`cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${checked ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''}`}
                    >
                      {multiSelect && (
                        <td className="px-4 py-2">
                          <input type="checkbox" checked={checked} readOnly className="pointer-events-none" />
                        </td>
                      )}
                      {leadingColumn && (
                        <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{leadingColumn.render(r)}</td>
                      )}
                      <td className="max-w-xs truncate px-4 py-2">
                        <span style={{ paddingLeft: `${depth * 1.25}rem` }} className="inline-flex items-center gap-1">
                          {r.hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleCollapsed(r.id)
                              }}
                              className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              aria-label={expanded ? 'Collapse' : 'Expand'}
                            >
                              {expanded ? '▾' : '▸'}
                            </button>
                          ) : (
                            depth > 0 && <span className="w-3 shrink-0" />
                          )}
                          {r.title}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">{r.subtitle}</td>
                      {columns?.map((c) => (
                        <td key={c.label} className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                          {c.render(r)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {multiSelect && (
          <div className="flex justify-end border-t border-slate-200 p-3 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
