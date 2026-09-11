import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ENTRY_TYPE_KEYS, typeDef } from '../kb/schema'
import { useKb } from '../kb/store'
import { Role, canEdit } from '../types'
import { btn, input, tone } from './ui'

const DARK_KEY = 'hochhuth-kb.dark'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, setRole, visible } = useKb()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(DARK_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem(DARK_KEY, dark ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [dark])

  // cmd/ctrl+K focuses search — the one shortcut people expect from a KB
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const counts = ENTRY_TYPE_KEYS.map((k) => ({ key: k, n: visible.filter((e) => e.type === k).length }))

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition ${
      isActive
        ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
    }`

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
        <Link to="/" className="flex items-center gap-2.5 px-4 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
            HC
          </span>
          <span className="text-sm font-semibold leading-tight">
            Hochhuth
            <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">Knowledge Base</span>
          </span>
        </Link>

        <nav className="space-y-0.5 px-3">
          <NavLink to="/" end className={navCls}>
            Overview
          </NavLink>

          {counts.map(({ key, n }) => {
            const t = typeDef(key)
            return (
              <NavLink key={key} to={`/type/${key}`} className={navCls}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone[t.tone].solid}`} />
                  <span className="truncate">{t.label}</span>
                </span>
                <span className="tabular-nums text-xs text-slate-400">{n}</span>
              </NavLink>
            )
          })}

          {currentUser.role === 'admin' && (
            <>
              <div className="mx-1.5 my-2 border-t border-slate-200 dark:border-slate-800" />
              <NavLink to="/admin" className={navCls}>
                Admin
              </NavLink>
            </>
          )}
        </nav>

        <div className="mt-auto space-y-1.5 border-t border-slate-200 p-4 dark:border-slate-800">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Preview as role
          </label>
          <select
            value={currentUser.role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={`${input} text-xs`}
            title="Demo only — real deployments read this from the session"
          >
            <option value="admin">Admin — Utkarsh</option>
            <option value="editor">Editor — Priya</option>
            <option value="viewer">Viewer — Jonas</option>
            <option value="client">Client — Müller AG</option>
          </select>
          <p className="text-[11px] leading-snug text-slate-400">
            Switch to <span className="font-medium">Client</span> to see exactly what an external account can reach.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <form
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(`/browse?q=${encodeURIComponent(q)}`)
            }}
          >
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search titles, content, tags, research findings…"
              className={`${input} max-w-xl pr-14`}
            />
            <kbd className="pointer-events-none absolute right-3 top-2.5 hidden rounded border border-slate-300 px-1.5 text-[10px] text-slate-400 dark:border-slate-700 sm:block">
              ⌘K
            </kbd>
          </form>

          <button onClick={() => setDark((d) => !d)} className={btn.ghost} title="Toggle dark mode">
            {dark ? 'Light' : 'Dark'}
          </button>

          {canEdit(currentUser.role) && (
            <Link to="/new" className={btn.primary}>
              New entry
            </Link>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
