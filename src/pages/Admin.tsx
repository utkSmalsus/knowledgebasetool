import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { computeHealth } from '../kb/health'
import { ENTRY_TYPE_KEYS, typeDef } from '../kb/schema'
import { isSharePointConfigured, sharepointConfig } from '../kb/sharepoint/config'
import { SpFieldInfo, getDistinctFieldValues, getListFields } from '../kb/sharepoint/client'
import { provisionKnowledgeBaseList } from '../kb/sharepoint/provision'
import { pullEntriesFromSharePoint, pushEntriesToSharePoint } from '../kb/sharepoint/sync'
import { useKb } from '../kb/store'
import { Category, isExpired } from '../types'
import { Monogram, PageTitle, Panel, SectionTitle, VerificationBadge, btn, input, tone } from '../components/ui'

export default function Admin() {
  const { categories, portfolios, users, entries, saveCategory, removeCategory, addPortfolio, removePortfolio, importEntries } = useKb()
  const [newCat, setNewCat] = useState('')
  const [newParent, setNewParent] = useState('')
  const [newPortfolio, setNewPortfolio] = useState('')
  const toast = useToast()
  const [spBusy, setSpBusy] = useState<'pull' | 'push' | 'provision' | null>(null)
  const [spProgress, setSpProgress] = useState<{ done: number; total: number } | null>(null)
  const [provisionStep, setProvisionStep] = useState('')

  const handleProvision = async () => {
    setSpBusy('provision')
    setProvisionStep('')
    try {
      await provisionKnowledgeBaseList((step, done, total) => {
        setProvisionStep(total > 1 ? `${step} (${done}/${total})` : step)
      })
      toast(`"${sharepointConfig.listName}" is ready in SharePoint.`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Provisioning failed.', 'error')
    } finally {
      setSpBusy(null)
      setProvisionStep('')
    }
  }
  const [inspectListTitle, setInspectListTitle] = useState('Master Tasks')
  const [inspectResult, setInspectResult] = useState<{ list: string; fields: SpFieldInfo[] } | null>(null)
  const [inspectBusy, setInspectBusy] = useState(false)
  const [sampleListTitle, setSampleListTitle] = useState('Master Tasks')
  const [sampleField, setSampleField] = useState('Item_x0020_Type')
  const [sampleResult, setSampleResult] = useState<{ list: string; field: string; values: { value: string; count: number }[] } | null>(
    null,
  )
  const [sampleBusy, setSampleBusy] = useState(false)

  const handleInspect = async () => {
    if (!inspectListTitle.trim()) return
    setInspectBusy(true)
    setInspectResult(null)
    try {
      const fields = await getListFields(inspectListTitle.trim())
      setInspectResult({ list: inspectListTitle.trim(), fields })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not read that list’s schema.', 'error')
    } finally {
      setInspectBusy(false)
    }
  }

  const handleSample = async () => {
    if (!sampleListTitle.trim() || !sampleField.trim()) return
    setSampleBusy(true)
    setSampleResult(null)
    try {
      const values = await getDistinctFieldValues(sampleListTitle.trim(), sampleField.trim())
      setSampleResult({ list: sampleListTitle.trim(), field: sampleField.trim(), values })
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not read that field’s values.', 'error')
    } finally {
      setSampleBusy(false)
    }
  }

  const handlePull = async () => {
    setSpBusy('pull')
    try {
      const pulled = await pullEntriesFromSharePoint()
      importEntries(pulled)
      toast(`Pulled ${pulled.length} entries from SharePoint.`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Pull from SharePoint failed.', 'error')
    } finally {
      setSpBusy(null)
      setSpProgress(null)
    }
  }

  const handlePush = async () => {
    setSpBusy('push')
    try {
      await pushEntriesToSharePoint(entries, users, (done, total) => setSpProgress({ done, total }))
      toast(`Pushed ${entries.length} entries to SharePoint.`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Push to SharePoint failed.', 'error')
    } finally {
      setSpBusy(null)
      setSpProgress(null)
    }
  }

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
  const outdated = entries
    .filter((e) => e.verification.state === 'needs_update' || isExpired(e.verification) || e.feedback.some((f) => f.verdict === 'no'))
    .sort((a, b) => b.views - a.views)

  const contributors = Array.from(new Set(entries.map((e) => e.author)))
    .map((name) => {
      const authored = entries.filter((e) => e.author === name)
      const activeRecently = authored.some((e) => Date.now() - new Date(e.updatedAt).getTime() < 90 * 86400000)
      return { name, count: authored.length, activeRecently }
    })
    .sort((a, b) => b.count - a.count)

  const byType = ENTRY_TYPE_KEYS.map((k) => ({ key: k, n: entries.filter((e) => e.type === k).length }))
  const maxType = Math.max(1, ...byType.map((t) => t.n))
  const noOwner = entries.filter((e) => !e.reviewer && e.verification.state !== 'verified')

  const mostViewed = [...entries].sort((a, b) => b.views - a.views).slice(0, 5)
  const mostUseful = entries
    .filter((e) => e.feedback.length > 0)
    .map((e) => ({ e, ratio: e.feedback.filter((f) => f.verdict === 'yes').length / e.feedback.length }))
    .sort((a, b) => b.ratio - a.ratio || b.e.feedback.length - a.e.feedback.length)
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <PageTitle>Admin</PageTitle>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Knowledge health, taxonomy, and who has access.</p>
      </div>

      {/* ---------- Knowledge health ---------- */}
      <section className="space-y-4">
        <SectionTitle>Knowledge health</SectionTitle>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
          <Stat label="Total" value={health.total} />
          <Stat label="Verified" value={health.verified} tone="emerald" />
          <Stat label="Under review" value={health.underReview} tone="sky" />
          <Stat label="Needs update" value={health.needsUpdate} tone="amber" />
          <Stat label="Expired" value={health.expired} tone="amber" />
          <Stat label="Drafts" value={health.drafts} />
          <Stat label="No reviewer" value={noOwner.length} tone={noOwner.length > 0 ? 'amber' : undefined} />
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
          <Panel title="Outdated knowledge" hint="Needs update, past its review date, or reported inaccurate">
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

          <Panel title="Knowledge by type" hint="Which areas have the most knowledge">
            <ul className="space-y-2.5 p-4">
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
                          className={`h-full rounded-full transition-all duration-500 ${tone[def.tone].solid}`}
                          style={{ width: `${Math.round((n / maxType) * 100)}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel title="No reviewer assigned" hint="Not yet verified, and nobody is on the hook to check it">
            {noOwner.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">Every unverified entry has a reviewer assigned.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {noOwner.slice(0, 6).map((e) => (
                  <li key={e.id} className="flex items-center gap-2 px-4 py-2.5">
                    <Monogram type={e.type} size="sm" />
                    <Link to={`/entry/${e.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                      {e.title}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-400">{e.author}</span>
                  </li>
                ))}
              </ul>
            )}
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

      {/* ---------- SharePoint connectivity ---------- */}
      <Panel
        title="SharePoint"
        hint="Connects this browser to a SharePoint list on demand — it does not replace local storage as the source of truth. See SHAREPOINT.md for setup."
      >
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                isSharePointConfigured()
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900'
                  : 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900'
              }`}
            >
              {isSharePointConfigured() ? '● Configured' : '○ Not configured'}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Mode: <span className="font-medium text-slate-700 dark:text-slate-300">{sharepointConfig.authMode}</span>
              {sharepointConfig.siteUrl && (
                <>
                  {' '}
                  · Site: <span className="font-medium text-slate-700 dark:text-slate-300">{sharepointConfig.siteUrl}</span>
                </>
              )}
              {' '}
              · List: <span className="font-medium text-slate-700 dark:text-slate-300">{sharepointConfig.listName}</span>
            </span>
          </div>

          {!isSharePointConfigured() && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">VITE_SP_SITE_URL</code> (and the MSAL vars, if using{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">msal</code> mode) in your{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">.env</code> file, then restart the dev server. See
              SHAREPOINT.md for the full walkthrough.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleProvision} disabled={!isSharePointConfigured() || spBusy !== null} className={btn.primary}>
              {spBusy === 'provision' ? provisionStep || 'Provisioning…' : `Provision "${sharepointConfig.listName}" list`}
            </button>
            <button onClick={handlePull} disabled={!isSharePointConfigured() || spBusy !== null} className={btn.ghost}>
              {spBusy === 'pull' ? 'Pulling…' : 'Pull from SharePoint'}
            </button>
            <button onClick={handlePush} disabled={!isSharePointConfigured() || spBusy !== null} className={btn.ghost}>
              {spBusy === 'push'
                ? spProgress
                  ? `Pushing ${spProgress.done}/${spProgress.total}…`
                  : 'Pushing…'
                : 'Push to SharePoint'}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Provision creates the "{sharepointConfig.listName}" list and its columns if they don't already exist (safe to click more than
            once) — including Portfolio/Project as real Lookup columns into "Master Tasks", without ever modifying Master Tasks itself.
            Pull upserts SharePoint's entries into this browser by id. Push creates or updates entries in SharePoint — it never deletes
            there. All three prompt for sign-in the first time, per the configured auth mode.
          </p>

          <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-400">Inspect a list's schema</p>
            <p className="text-xs text-slate-400">
              Read-only — fetches another list's real columns (name, type, and lookup target) so field mapping can be built against what
              actually exists instead of guesses.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={inspectListTitle}
                onChange={(e) => setInspectListTitle(e.target.value)}
                placeholder="e.g. Master Tasks"
                className={`${input} w-auto flex-1`}
              />
              <button onClick={handleInspect} disabled={!isSharePointConfigured() || inspectBusy} className={btn.ghost}>
                {inspectBusy ? 'Reading…' : 'Inspect schema'}
              </button>
            </div>

            {inspectResult && (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 uppercase text-slate-400 dark:bg-slate-800/60">
                    <tr>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Internal name</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Lookup list</th>
                      <th className="px-3 py-2">Lookup field</th>
                      <th className="px-3 py-2">Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {inspectResult.fields.map((f) => (
                      <tr key={f.internalName}>
                        <td className="px-3 py-1.5">{f.title}</td>
                        <td className="px-3 py-1.5 font-mono">{f.internalName}</td>
                        <td className="px-3 py-1.5">{f.type}</td>
                        <td className="px-3 py-1.5">{f.lookupList ?? '—'}</td>
                        <td className="px-3 py-1.5">{f.lookupField ?? '—'}</td>
                        <td className="px-3 py-1.5">{f.required ? 'Yes' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase text-slate-400">Sample a field's real values</p>
            <p className="text-xs text-slate-400">
              Read-only — distinct values (with counts) of one field across every item in a list, e.g. to see what Item_x0020_Type
              actually contains instead of guessing from application code.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={sampleListTitle}
                onChange={(e) => setSampleListTitle(e.target.value)}
                placeholder="List title, e.g. Master Tasks"
                className={`${input} w-auto flex-1`}
              />
              <input
                value={sampleField}
                onChange={(e) => setSampleField(e.target.value)}
                placeholder="Field internal name, e.g. Item_x0020_Type"
                className={`${input} w-auto flex-1`}
              />
              <button onClick={handleSample} disabled={!isSharePointConfigured() || sampleBusy} className={btn.ghost}>
                {sampleBusy ? 'Reading…' : 'Sample values'}
              </button>
            </div>

            {sampleResult && (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 uppercase text-slate-400 dark:bg-slate-800/60">
                    <tr>
                      <th className="px-3 py-2">Value</th>
                      <th className="px-3 py-2">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sampleResult.values.map((v) => (
                      <tr key={v.value}>
                        <td className="px-3 py-1.5 font-mono">{v.value}</td>
                        <td className="px-3 py-1.5 tabular-nums">{v.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
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
