import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ENTRY_TYPE_KEYS, typeDef } from '../kb/schema'
import { useKb } from '../kb/store'
import { Role, canEdit, canReview } from '../types'
import CommandPalette from './CommandPalette'
import { Kbd, btn, input, tone } from './ui'

const DARK_KEY = 'hochhuth-kb.dark'
const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)

const NAV_ICON: Record<string, string> = {
  explore: '🧭',
  saved: '★',
  experts: '🎓',
  review: '✓',
  admin: '⚙',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, setRole, visible } = useKb()
  const location = useLocation()

  // SPA navigation doesn't reset scroll on its own — every page should open at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
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

  // cmd/ctrl+K opens the command palette — the core of how this product wants to be used
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const counts = ENTRY_TYPE_KEYS.map((k) => ({ key: k, n: visible.filter((e) => e.type === k).length }))

  const navCls = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${
      isActive
        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 font-medium text-white shadow-sm shadow-indigo-600/20'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
    }`

  const NavContent = (
    <>
      <Link to="/" className="flex items-center gap-2.5 px-4 py-4" onClick={() => setMobileNavOpen(false)}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-xs font-bold text-white shadow-md shadow-indigo-500/30">
          HC
        </span>
        <span className="text-sm font-semibold leading-tight">
          Hochhuth
          <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">Knowledge Hub</span>
        </span>
      </Link>

      <nav className="space-y-0.5 px-3">
        <NavLink to="/browse" className={navCls} onClick={() => setMobileNavOpen(false)}>
          <span className="flex items-center gap-2">
            <span aria-hidden className="w-4 text-center opacity-80">{NAV_ICON.explore}</span>
            Explore
          </span>
        </NavLink>
        {/* Saved & recent is disabled — see App.tsx, CommandPalette.tsx, EntryDetail.tsx, Dashboard.tsx, Saved.tsx
        <NavLink to="/saved" className={navCls} onClick={() => setMobileNavOpen(false)}>
          <span className="flex items-center gap-2">
            <span aria-hidden className="w-4 text-center opacity-80">{NAV_ICON.saved}</span>
            Saved &amp; recent
          </span>
        </NavLink>
        */}
        <NavLink to="/experts" className={navCls} onClick={() => setMobileNavOpen(false)}>
          <span className="flex items-center gap-2">
            <span aria-hidden className="w-4 text-center opacity-80">{NAV_ICON.experts}</span>
            Experts
          </span>
        </NavLink>
        {canReview(currentUser.role) && (
          <NavLink to="/review" className={navCls} onClick={() => setMobileNavOpen(false)}>
            <span className="flex items-center gap-2">
              <span aria-hidden className="w-4 text-center opacity-80">{NAV_ICON.review}</span>
              Review queue
            </span>
          </NavLink>
        )}

        <div className="mx-1.5 my-2 border-t border-slate-200 dark:border-slate-800" />

        {counts.map(({ key, n }) => {
          const t = typeDef(key)
          return (
            <NavLink key={key} to={`/type/${key}`} className={navCls} onClick={() => setMobileNavOpen(false)}>
              <span className="flex min-w-0 items-center gap-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone[t.tone].solid}`} />
                <span className="truncate">{t.label}</span>
              </span>
              <span className="tabular-nums text-xs opacity-60">{n}</span>
            </NavLink>
          )
        })}

        {currentUser.role === 'admin' && (
          <>
            <div className="mx-1.5 my-2 border-t border-slate-200 dark:border-slate-800" />
            <NavLink to="/admin" className={navCls} onClick={() => setMobileNavOpen(false)}>
              <span className="flex items-center gap-2">
                <span aria-hidden className="w-4 text-center opacity-80">{NAV_ICON.admin}</span>
                Admin
              </span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Demo-only account switcher — deliberately styled as a dev facility, never a real feature. */}
      <div className="mt-auto space-y-2 border-t border-dashed border-amber-300/70 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          <span aria-hidden>🛠</span> Preview mode
        </div>
        <select
          value={currentUser.role}
          onChange={(e) => setRole(e.target.value as Role)}
          className={`${input} border-amber-300 bg-white text-xs dark:border-amber-900/60 dark:bg-slate-950`}
          title="Demo only — a real deployment reads this from the signed-in session, not a dropdown"
        >
          <option value="admin">Admin — Utkarsh</option>
          <option value="editor">Editor — Priya</option>
          <option value="viewer">Viewer — Jonas</option>
          <option value="client">Client — Müller AG</option>
        </select>
        <p className="text-[11px] leading-snug text-amber-800/80 dark:text-amber-200/70">
          Not a real account switcher — lets you preview what each role sees.
        </p>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* mobile nav drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 animate-fade-in" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[80vw] animate-slide-in-right flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {NavContent}
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
        {NavContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:gap-3 sm:px-4">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-md border border-slate-300 p-1.5 text-slate-600 dark:border-slate-700 dark:text-slate-300 md:hidden"
            aria-label="Open navigation"
          >
            ☰
          </button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={`${input} flex min-w-0 max-w-xl flex-1 cursor-text items-center justify-between gap-2 text-left text-slate-400`}
          >
            <span className="truncate">Search knowledge, ask a question, or find an expert…</span>
            <span className="hidden shrink-0 sm:block">
              <Kbd>{isMac ? '⌘' : 'Ctrl'} K</Kbd>
            </span>
          </button>

          <button onClick={() => setDark((d) => !d)} className={btn.ghost} title="Toggle dark mode">
            <span aria-hidden>{dark ? '☀' : '☾'}</span>
            <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>
          </button>

          {canEdit(currentUser.role) && (
            <Link to="/new" className={btn.primary}>
              <span className="hidden sm:inline">New entry</span>
              <span className="sm:hidden">+</span>
            </Link>
          )}
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
