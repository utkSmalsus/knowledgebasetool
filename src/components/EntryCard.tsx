import { Link } from 'react-router-dom'
import { relevantBecause } from '../kb/search'
import { typeDef } from '../kb/schema'
import { Entry } from '../types'
import { Monogram, StageChip, StatusChip, Tag, TechChip, VerificationBadge, VisibilityChip, relative, tone } from './ui'

export default function EntryCard({
  entry,
  showVisibility = true,
  compact = false,
  query,
}: {
  entry: Entry
  showVisibility?: boolean
  compact?: boolean
  /** When set, shows a "Relevant because" line naming the entry's own tags/tech that matched. */
  query?: string
}) {
  const def = typeDef(entry.type)
  const reasons = query ? relevantBecause(entry, query) : []
  return (
    <Link
      to={`/entry/${entry.id}`}
      className={`block rounded-xl border border-l-4 border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${
        tone[def.tone].border
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex gap-3">
        <Monogram type={entry.type} size={compact ? 'sm' : 'md'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className={`font-semibold leading-snug ${compact ? 'text-sm' : 'text-sm'}`}>{entry.title}</h3>
            {!compact && <span className={`shrink-0 text-[11px] font-medium ${tone[def.tone].text}`}>{def.label}</span>}
          </div>
          {(entry.portfolio || entry.project) && !compact && (
            <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
              {entry.portfolio}
              {entry.portfolio && entry.project && ' · '}
              {entry.project}
            </p>
          )}
          {entry.summary && !compact && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{entry.summary}</p>
          )}

          {reasons.length > 0 && (
            <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400">
              Relevant because: <span className="font-medium">{reasons.slice(0, 4).join(', ')}</span>
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <VerificationBadge entry={entry} size="sm" />
            {!compact && <StageChip type={entry.type} stage={entry.stage} />}
            <StatusChip status={entry.status} />
            {showVisibility && entry.visibility === 'client' && <VisibilityChip visibility={entry.visibility} />}
            {!compact &&
              entry.tech.slice(0, 4).map((t) => <TechChip key={t} k={t} />)}
            {!compact &&
              entry.tags.slice(0, 3).map((t) => <Tag key={t} name={t} />)}
          </div>

          <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            {entry.author} · updated {relative(entry.updatedAt)}
            {!compact && ` · ${entry.views} views`}
          </div>
        </div>
      </div>
    </Link>
  )
}
