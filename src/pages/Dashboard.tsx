import { Link } from 'react-router-dom'
import EntryCard from '../components/EntryCard'
import { Empty, Monogram, Panel, Pill, StatusChip, btn, relative, tone } from '../components/ui'
import { needsAttention } from '../kb/attention'
import { ENTRY_TYPE_KEYS, TECH, typeDef } from '../kb/schema'
import { useKb } from '../kb/store'
import { canEdit, isInternal } from '../types'

export default function Dashboard() {
  const { visible, currentUser } = useKb()
  const internal = isInternal(currentUser.role)

  const byType = ENTRY_TYPE_KEYS.map((k) => ({ key: k, n: visible.filter((e) => e.type === k).length }))
  const maxType = Math.max(1, ...byType.map((t) => t.n))
  const byTech = TECH.map((t) => ({ ...t, n: visible.filter((e) => e.tech.includes(t.key)).length }))
    .filter((t) => t.n > 0)
    .sort((a, b) => b.n - a.n)

  const recent = [...visible].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6)
  const popular = [...visible].sort((a, b) => b.views - a.views).slice(0, 5)
  const attention = internal ? needsAttention(visible) : []

  const stats = internal
    ? [
        { label: 'Entries', value: visible.length, to: '/browse' },
        { label: 'Published', value: visible.filter((e) => e.status === 'published').length, to: '/browse?status=published' },
        { label: 'Drafts', value: visible.filter((e) => e.status === 'draft').length, to: '/browse?status=draft' },
        {
          label: 'Client-visible',
          value: visible.filter((e) => e.visibility === 'client').length,
          to: '/browse?visibility=client',
        },
      ]
    : [{ label: 'Entries available to you', value: visible.length, to: '/browse' }]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{currentUser.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {internal ? (
              <>
                Signed in as <span className="font-medium capitalize">{currentUser.role}</span> — you can see internal
                material, drafts and edit history.
              </>
            ) : (
              <>Client account — you see only published entries shared with you.</>
            )}
          </p>
        </div>
        {canEdit(currentUser.role) && (
          <Link to="/new" className={btn.primary}>
            New entry
          </Link>
        )}
      </div>

      <div className={`grid gap-3 ${internal ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.to}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
          </Link>
        ))}
      </div>

      {attention.length > 0 && (
        <Panel
          title="Needs attention"
          hint="Knowledge goes stale quietly — these are the entries asking for a human"
        >
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {attention.slice(0, 6).map(({ entry, reason }) => (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                <Monogram type={entry.type} size="sm" />
                <Link to={`/entry/${entry.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                  {entry.title}
                </Link>
                <StatusChip status={entry.status} />
                <span className="hidden shrink-0 text-xs text-amber-700 dark:text-amber-300 sm:block">{reason}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Recently updated">
          <div className="space-y-3 p-3">
            {recent.length === 0 && <Empty title="Nothing here yet" />}
            {recent.map((e) => (
              <EntryCard key={e.id} entry={e} showVisibility={internal} />
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Knowledge by type">
            <ul className="space-y-2 p-4">
              {byType.map(({ key, n }) => {
                const def = typeDef(key)
                return (
                  <li key={key}>
                    <Link to={`/type/${key}`} className="group block">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium group-hover:underline">{def.label}</span>
                        <span className="tabular-nums text-slate-500">{n}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${tone[def.tone].solid}`}
                          style={{ width: `${Math.round((n / maxType) * 100)}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel title="By technology" hint="The axis you actually search on">
            <div className="flex flex-wrap gap-1.5 p-4">
              {byTech.map((t) => (
                <Link key={t.key} to={`/browse?tech=${t.key}`}>
                  <Pill t="gray">
                    {t.label} <span className="tabular-nums opacity-60">{t.n}</span>
                  </Pill>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Most read">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {popular.map((e) => (
                <li key={e.id} className="flex items-center gap-2 px-4 py-2">
                  <Monogram type={e.type} size="sm" />
                  <Link to={`/entry/${e.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                    {e.title}
                  </Link>
                  <span className="shrink-0 text-xs tabular-nums text-slate-400">{e.views}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
