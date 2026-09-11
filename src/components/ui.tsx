import { Link } from 'react-router-dom'
import { renderMarkdown } from '../kb/markdown'
import { EntryTypeKey, Tone, stageFor, techLabel, typeDef } from '../kb/schema'
import { EntryStatus, Visibility } from '../types'

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
      className={`prose prose-slate max-w-none prose-sm dark:prose-invert prose-headings:font-semibold prose-pre:bg-slate-900 prose-pre:text-slate-100 ${className}`}
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
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
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
    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
  ghost:
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  danger:
    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:hover:bg-rose-950',
}

export const input =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-white/10'

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

export function relative(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.round(days / 30)} mo ago`
  return `${Math.round(days / 365)} yr ago`
}
