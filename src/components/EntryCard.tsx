import { Link } from 'react-router-dom'
import { relevantBecause } from '../kb/search'
import { typeDef } from '../kb/schema'
import { Entry } from '../types'
import { Monogram, StatusChip, VerificationBadge, relative, tone } from './ui'

/**
 * The most-repeated component in the product. Primary hierarchy only: title,
 * summary, type + trust state, author, updated. Everything else (tags, tech,
 * stage, views, portfolio) belongs on the detail page, not on every card.
 */
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
      className={`block rounded-xl border border-l-4 border-slate-200 bg-white shadow-sm transition hover:-translate-y-px hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 ${
        tone[def.tone].border
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex gap-3">
        <Monogram type={entry.type} size={compact ? 'sm' : 'md'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold leading-snug">{entry.title}</h3>
            {!compact && <span className={`shrink-0 text-[11px] font-medium ${tone[def.tone].text}`}>{def.label}</span>}
          </div>

          {entry.summary && !compact && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{entry.summary}</p>
          )}

          {reasons.length > 0 && (
            <p className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-400">
              Relevant because <span className="font-medium">{reasons.slice(0, 3).join(', ')}</span>
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <VerificationBadge entry={entry} size="sm" />
            {entry.status !== 'published' && <StatusChip status={entry.status} />}
            {showVisibility && entry.visibility === 'client' && (
              <span className="text-[11px] text-slate-400" title="Client-visible">
                🌐
              </span>
            )}
          </div>

          <div className="mt-2 truncate text-[11px] text-slate-400 dark:text-slate-500">
            {entry.author} · updated {relative(entry.updatedAt)}
          </div>
        </div>
      </div>
    </Link>
  )
}
