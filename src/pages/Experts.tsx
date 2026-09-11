import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, PageTitle, TechChip, input } from '../components/ui'
import { techLabel } from '../kb/schema'
import { useKb } from '../kb/store'

interface ExpertRow {
  name: string
  team?: string
  role?: string
  contributed: number
  verified: number
  expertise: string[]
}

export default function Experts() {
  const { visible, users } = useKb()
  const [q, setQ] = useState('')

  const rows: ExpertRow[] = useMemo(() => {
    const authors = Array.from(new Set(visible.map((e) => e.author)))
    return authors
      .map((name) => {
        const authored = visible.filter((e) => e.author === name)
        const verified = authored.filter((e) => e.verification.state === 'verified').length
        const techCount = new Map<string, number>()
        authored.forEach((e) => e.tech.forEach((t) => techCount.set(t, (techCount.get(t) ?? 0) + 1)))
        const expertise = Array.from(techCount.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([t]) => t)
        const user = users.find((u) => u.name === name)
        return { name, team: user?.team, role: user?.role, contributed: authored.length, verified, expertise }
      })
      .filter((r) => r.contributed > 0)
      .sort((a, b) => b.contributed - a.contributed)
  }, [visible, users])

  const filtered = q.trim()
    ? rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q.toLowerCase()) ||
          r.expertise.some((t) => techLabel(t).toLowerCase().includes(q.toLowerCase()) || t.includes(q.toLowerCase())),
      )
    : rows

  return (
    <div className="space-y-6">
      <div>
        <PageTitle>Find an expert</PageTitle>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Who to ask, based on what they've actually written and had verified.</p>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder='Try "Kubernetes", "SPFx", or a name…'
        className={`${input} max-w-md`}
      />

      {filtered.length === 0 ? (
        <Empty title="No one matches yet" hint="Try a broader technology or a different name." />
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div key={r.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  {r.name
                    .replace(/\(.*\)/, '')
                    .trim()
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.name}</div>
                  <div className="text-xs capitalize text-slate-500 dark:text-slate-400">
                    {r.role}
                    {r.team ? ` · ${r.team}` : ''}
                  </div>
                </div>
              </div>

              {r.expertise.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.expertise.slice(0, 5).map((t) => (
                    <TechChip key={t} k={t} to={`/browse?tech=${t}&author=${encodeURIComponent(r.name)}`} />
                  ))}
                </div>
              )}

              <div className="mt-3 flex gap-4 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <Link to={`/browse?author=${encodeURIComponent(r.name)}`} className="hover:underline">
                  <span className="font-semibold">{r.contributed}</span> contributed
                </Link>
                <span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{r.verified}</span> verified
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
