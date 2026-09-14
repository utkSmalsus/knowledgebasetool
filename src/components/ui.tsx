import { Link } from 'react-router-dom'
import { renderMarkdown } from '../kb/markdown'
import { EntryTypeKey, Tone, VERIFICATION_META, evidenceTypeIcon, stageFor, techLabel, typeDef } from '../kb/schema'
import { Entry, EntryStatus, Evidence, Visibility, daysUntil, isExpired } from '../types'

export const tone: Record<Tone, { chip: string; solid: string; text: string; border: string }> = {
  gray: {
    chip: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
    solid: 'bg-slate-500',
    text: 'text-slate-600 dark:text-slate-300',
    border: 'border-l-slate-400',
  },
  blue: {
    chip: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-900',
    solid: 'bg-sky-600',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-l-sky-500',
  },
  green: {
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900',
    solid: 'bg-emerald-600',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-l-emerald-500',
  },
  red: {
    chip: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-900',
    solid: 'bg-rose-600',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-l-rose-500',
  },
  amber: {
    chip: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900',
    solid: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-l-amber-500',
  },
  violet: {
    chip: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-900',
    solid: 'bg-violet-600',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-l-violet-500',
  },
  teal: {
    chip: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-950 dark:text-teal-200 dark:ring-teal-900',
    solid: 'bg-teal-600',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-l-teal-500',
  },
}

export function Pill({ t = 'gray', children, title }: { t?: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tone[t].chip}`}
    >
      {children}
    </span>
  )
}

export function Monogram({ type, size = 'md' }: { type: EntryTypeKey; size?: 'sm' | 'md' }) {
  const def = typeDef(type)
  return (
    <span
      title={def.label}
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-bold text-white ${tone[def.tone].solid} ${
        size === 'sm' ? 'h-5 w-5 text-[9px]' : 'h-8 w-8 text-[11px]'
      }`}
    >
      {def.monogram}
    </span>
  )
}

export function TypeChip({ type }: { type: EntryTypeKey }) {
  const def = typeDef(type)
  return <Pill t={def.tone}>{def.label}</Pill>
}

export function StageChip({ type, stage }: { type: EntryTypeKey; stage?: string }) {
  const s = stageFor(type, stage)
  if (!s) return null
  return (
    <Pill t={s.tone} title={typeDef(type).stageLabel}>
      {s.label}
    </Pill>
  )
}

export function StatusChip({ status }: { status: EntryStatus }) {
  if (status === 'published') return null // the normal case needs no badge
  return <Pill t={status === 'draft' ? 'amber' : 'gray'}>{status === 'draft' ? 'Draft' : 'Archived'}</Pill>
}

export function VisibilityChip({ visibility }: { visibility: Visibility }) {
  return visibility === 'client' ? (
    <Pill t="blue" title="Clients with an account can see this">
      Client-visible
    </Pill>
  ) : (
    <Pill t="gray" title="Never shown to client accounts">
      Internal
    </Pill>
  )
}

/** The trust badge — the single most important new piece of UI in this product. */
export function VerificationBadge({
  entry,
  size = 'md',
}: {
  entry: Pick<Entry, 'verification'>
  size?: 'sm' | 'md'
}) {
  const v = entry.verification
  const expired = isExpired(v)
  const meta = VERIFICATION_META[expired ? 'needs_update' : v.state]
  const label = expired ? 'Verification expired' : meta.label
  return (
    <span
      title={expired ? 'This was verified, but its scheduled re-review date has passed.' : meta.description}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ${tone[meta.tone].chip} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span aria-hidden>{expired ? '⚠' : meta.icon}</span>
      {label}
    </span>
  )
}

export function EvidenceRow({ e }: { e: Evidence }) {
  return (
    <a
      href={e.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800/60"
    >
      <span aria-hidden className="shrink-0">{evidenceTypeIcon(e.type)}</span>
      <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{e.label}</span>
      <span className="shrink-0 text-slate-300 dark:text-slate-600">↗</span>
    </a>
  )
}

/** A page's single H1 — one size, used exactly once per page. */
export function PageTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h1 className={`text-2xl font-bold tracking-tight text-slate-900 dark:text-white ${className}`}>{children}</h1>
}

/** A section heading inside a page — one step down from PageTitle. */
export function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-base font-semibold text-slate-900 dark:text-slate-100 ${className}`}>{children}</h2>
}

/** Small uppercase eyebrow label — used above a group of fields or a stat. */
export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${className}`}>{children}</p>
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center gap-0.5 rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      {children}
    </kbd>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />
}

/** Lightweight modal shell — used by the command palette, review actions, feedback dialog. */
export function Modal({
  open,
  onClose,
  children,
  align = 'center',
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  align?: 'center' | 'top'
  labelledBy?: string
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] animate-fade-in dark:bg-black/60"
      style={{ alignItems: align === 'top' ? 'flex-start' : 'center', paddingTop: align === 'top' ? '10vh' : undefined }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in dark:border-slate-800 dark:bg-slate-900"
      >
        {children}
      </div>
    </div>
  )
}

export function TechChip({ k, to }: { k: string; to?: string }) {
  const cls =
    'rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
  return to ? (
    <Link to={to} className={`${cls} hover:border-slate-400`}>
      {techLabel(k)}
    </Link>
  ) : (
    <span className={cls}>{techLabel(k)}</span>
  )
}

export function Tag({ name, to }: { name: string; to?: string }) {
  const cls = 'text-[11px] text-slate-500 dark:text-slate-400'
  return to ? (
    <Link to={to} className={`${cls} hover:text-slate-900 hover:underline dark:hover:text-slate-100`}>
      #{name}
    </Link>
  ) : (
    <span className={cls}>#{name}</span>
  )
}

export function Markdown({ source, className = '' }: { source?: string; className?: string }) {
  if (!source?.trim()) return null
  return (
    <div
      className={`prose prose-slate max-w-none prose-sm dark:prose-invert prose-headings:font-semibold prose-pre:bg-slate-950 prose-pre:text-slate-100 dark:prose-pre:bg-black/40 dark:prose-pre:ring-1 dark:prose-pre:ring-slate-800 ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  )
}

export function Panel({
  title,
  hint,
  actions,
  children,
  className = '',
}: {
  title?: string
  hint?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/25 transition hover:shadow-md hover:shadow-indigo-600/30 hover:brightness-110 disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100',
  ghost:
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  danger:
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:hover:bg-rose-950',
}

export const input =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20'

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** "in 12 days" / "3 days ago" / "today" — for review due dates and expirations. */
export function reviewDueLabel(iso?: string): string | undefined {
  const d = daysUntil(iso)
  if (d === undefined) return undefined
  if (d === 0) return 'due today'
  if (d > 0) return `in ${d} day${d === 1 ? '' : 's'}`
  return `${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} overdue`
}

export function relative(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.round(days / 30)} mo ago`
  return `${Math.round(days / 365)} yr ago`
}
