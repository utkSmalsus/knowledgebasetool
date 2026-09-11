import { Link } from 'react-router-dom'
import { typeDef } from '../kb/schema'
import { Entry } from '../types'
import { Monogram, StageChip, StatusChip, Tag, TechChip, VisibilityChip, relative, tone } from './ui'

export default function EntryCard({ entry, showVisibility = true }: { entry: Entry; showVisibility?: boolean }) {
  const def = typeDef(entry.type)
  return (
    <Link
      to={`/entry/${entry.id}`}
      className={`block rounded-xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${
        tone[def.tone].border
      }`}
    >
      <div className="flex gap-3">
        <Monogram type={entry.type} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold leading-snug">{entry.title}</h3>
            <span className={`shrink-0 text-[11px] font-medium ${tone[def.tone].text}`}>{def.label}</span>
          </div>
          {(entry.portfolio || entry.project) && (
            <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
              {entry.portfolio}
              {entry.portfolio && entry.project && ' · '}
              {entry.project}
            </p>
          )}
          {entry.summary && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{entry.summary}</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <StageChip type={entry.type} stage={entry.stage} />
            <StatusChip status={entry.status} />
            {showVisibility && entry.visibility === 'client' && <VisibilityChip visibility={entry.visibility} />}
            {entry.tech.slice(0, 4).map((t) => (
              <TechChip key={t} k={t} />
            ))}
            {entry.tags.slice(0, 3).map((t) => (
              <Tag key={t} name={t} />
            ))}
          </div>

          <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            {entry.author} · updated {relative(entry.updatedAt)} · {entry.views} views
          </div>
        </div>
      </div>
    </Link>
  )
}
