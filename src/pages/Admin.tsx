import { useState } from 'react'
import { Link } from 'react-router-dom'
import { computeHealth } from '../kb/health'
import { useKb } from '../kb/store'
import { Category, isExpired } from '../types'
import { Monogram, PageTitle, Panel, SectionTitle, VerificationBadge, btn, input } from '../components/ui'

export default function Admin() {
  const { categories, portfolios, users, entries, saveCategory, removeCategory, addPortfolio, removePortfolio, resetToSeed } = useKb()
  const [newCat, setNewCat] = useState('')
  const [newParent, setNewParent] = useState('')
  const [newPortfolio, setNewPortfolio] = useState('')

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCat.trim()) return
    const cat: Category = { id: newCat.trim().toLowerCase().replace(/\s+/g, '-'), name: newCat.trim(), parentId: newParent || undefined }
    saveCategory(cat)
    setNewCat('')
    setNewParent('')
  }

  const addPortfolioSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPortfolio.trim()) return
    addPortfolio(newPortfolio.trim())
    setNewPortfolio('')
  }

  const health = computeHealth(entries)
  const outdated = entries.filter((e) => e.verification.state === 'needs_update' || isExpired(e.verification)).sort((a, b) => b.views - a.views)

  const contributors = Array.from(new Set(entries.map((e) => e.author)))
    .map((name) => {
      const authored = entries.filter((e) => e.author === name)
      const activeRecently = authored.some((e) => Date.now() - new Date(e.updatedAt).getTime() < 90 * 86400000)
      return { name, count: authored.length, activeRecently }
    })
    .sort((a, b) => b.count - a.count)

  const mostViewed = [...entries].sort((a, b) => b.views - a.views).slice(0, 5)
  const mostUseful = entries
    .filter((e) => e.feedback.length > 0)
    .map((e) => ({ e, ratio: e.feedback.filter((f) => f.verdict === 'yes').length / e.feedback.length }))
    .sort((a, b) => b.ratio - a.ratio || b.e.feedback.length - a.e.feedback.length)
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageTitle>Admin</PageTitle>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Knowledge health, taxonomy, and who has access.</p>
        </div>
        <button
          onClick={() => confirm('Reset all entries and categories back to the seed data? Your changes will be lost.') && resetToSeed()}
          className={btn.ghost}
        >
          Reset demo data
        </button>
      </div>

      {/* ---------- Knowledge health ---------- */}
      <section className="space-y-4">
        <SectionTitle>Knowledge health</SectionTitle>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Stat label="Total" value={health.total} />
          <Stat label="Verified" value={health.verified} tone="emerald" />
          <Stat label="Under review" value={health.underReview} tone="sky" />
          <Stat label="Needs update" value={health.needsUpdate} tone="amber" />
          <Stat label="Expired" value={health.expired} tone="amber" />
          <Stat label="Drafts" value={health.drafts} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <Panel>
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="text-4xl font-bold tabular-nums">{health.score ?? '—'}{health.score !== null && '%'}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Knowledge Health</div>
              <p className="mt-2 text-[11px] leading-snug text-slate-400">
                A weighted average of the components on the right. Not a scientific measurement — a rough signal of where the gaps are.
              </p>
            </div>
          </Panel>

          <Panel title="How the score is built" hint="Each component only counts if there's real data behind it">
            <div className="space-y-3 p-4">
              {health.components.map((c) => (
                <div key={c.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {c.label} <span className="text-xs font-normal text-slate-400">({c.weight}% weight)</span>
                    </span>
                    <span className="tabular-nums text-slate-500">{c.pct === null ? 'no data' : `${c.pct}%`}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-all duration-500 dark:bg-white"
                      style={{ width: `${c.pct ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{c.detail}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Outdated knowledge" hint="Needs update, or past its scheduled review date">
            {outdated.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">Nothing outdated right now.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {outdated.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 px-4 py-2.5">
                    <Monogram type={e.type} size="sm" />
                    <Link to={`/entry/${e.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                      {e.title}
                    </Link>
                    <VerificationBadge entry={e} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Active contributors" hint="Authors, by entries owned — bold if updated in the last 90 days">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {contributors.map((c) => (
                <li key={c.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className={c.activeRecently ? 'font-medium' : 'text-slate-500 dark:text-slate-400'}>{c.name}</span>
                  <span className="tabular-nums text-slate-400">{c.count}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Most viewed">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {mostViewed.map((e) => (
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

          <Panel title="Most useful" hint="Highest share of positive accuracy feedback">
            {mostUseful.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">No feedback submitted yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {mostUseful.map(({ e, ratio }) => (
                  <li key={e.id} className="flex items-center gap-2 px-4 py-2">
                    <Monogram type={e.type} size="sm" />
                    <Link to={`/entry/${e.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                      {e.title}
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-slate-400">{Math.round(ratio * 100)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </section>

      {/* ---------- taxonomy ---------- */}
      <Panel title="Categories" hint="Entries are attached to a category id — deleting one just detaches its children, it never deletes entries">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2">{c.parentId ? `— ${c.name}` : c.name}</td>
                <td className="px-4 py-2 text-right text-xs text-slate-400">{entries.filter((e) => e.category === c.id).length} entries</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => removeCategory(c.id)} className="text-xs text-rose-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={addCategory} className="flex flex-wrap items-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
          <label className="flex-1 space-y-1 text-xs">
            <span className="font-semibold uppercase text-slate-500">New category</span>
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Security" className={input} />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-semibold uppercase text-slate-500">Parent (optional)</span>
            <select value={newParent} onChange={(e) => setNewParent(e.target.value)} className={input}>
              <option value="">None — top level</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button type="submit" className={btn.primary}>Add</button>
        </form>
      </Panel>

      <Panel title="Portfolios" hint="The business line / client account an entry belongs to — cross-cuts category and type">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {portfolios.map((p) => (
              <tr key={p}>
                <td className="px-4 py-2">{p}</td>
                <td className="px-4 py-2 text-right text-xs text-slate-400">{entries.filter((e) => e.portfolio === p).length} entries</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => removePortfolio(p)} className="text-xs text-rose-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={addPortfolioSubmit} className="flex flex-wrap items-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
          <label className="flex-1 space-y-1 text-xs">
            <span className="font-semibold uppercase text-slate-500">New portfolio</span>
            <input value={newPortfolio} onChange={(e) => setNewPortfolio(e.target.value)} placeholder="e.g. Managed Services" className={input} />
          </label>
          <button type="submit" className={btn.primary}>Add</button>
        </form>
      </Panel>

      <Panel title="Users & roles" hint="This prototype's data layer is local-only — real user management arrives with the backend">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Team</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 capitalize">{u.role}</td>
                <td className="px-4 py-2 text-slate-500">{u.team ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

function Stat({ label, value, tone: t }: { label: string; value: number; tone?: 'emerald' | 'sky' | 'amber' }) {
  const styles = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    sky: 'text-sky-600 dark:text-sky-400',
    amber: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`text-2xl font-bold tabular-nums ${t ? styles[t] : ''}`}>{value}</div>
      <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}
