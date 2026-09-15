import { useEffect, useRef, useState } from 'react'
import { input } from './ui'

export interface LookupItem {
  id: string
  title: string
  subtitle?: string
}

/**
 * A search-and-select popup for picking a real item from SharePoint (Portfolio/Project from
 * Master Tasks, Task across the per-team task lists) — the same click-to-search-and-pick pattern
 * the Meeting tool uses, reimplemented against this app's own plain-Tailwind UI instead of
 * porting its Fluent UI / tanstack-table machinery.
 */
export default function LookupPicker<T extends LookupItem>({
  title,
  placeholder = 'Search…',
  search,
  onSelect,
  onClose,
}: {
  title: string
  placeholder?: string
  search: (query: string) => Promise<T[]>
  onSelect: (item: T) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 pt-24" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
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

        <div className="max-h-80 overflow-y-auto p-2">
          {loading && results.length === 0 && <p className="p-3 text-xs text-slate-400">Loading…</p>}
          {error && <p className="p-3 text-xs text-rose-600">{error}</p>}
          {!loading && !error && results.length === 0 && <p className="p-3 text-xs text-slate-400">No matches.</p>}
          <ul className="space-y-0.5">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(r)
                    onClose()
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="truncate">{r.title}</span>
                  {r.subtitle && <span className="ml-2 shrink-0 text-xs text-slate-400">{r.subtitle}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
