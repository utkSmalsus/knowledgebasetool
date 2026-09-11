import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import EntryCard from '../components/EntryCard'
import { Empty, Monogram, Pill, input } from '../components/ui'
import { activeFilterCount, applyFilters, emptyFilters, Filters } from '../kb/search'
import { ENTRY_STATUSES, ENTRY_TYPE_KEYS, EntryTypeKey, TECH, typeDef } from '../kb/schema'
import { useKb } from '../kb/store'
import { isInternal } from '../types'

/**
 * Filters live in the URL — shareable, back-button-friendly, no extra state.
 * When `fixedType` is set (a dedicated /type/:key page), the type is locked —
 * it's never read from or written to the URL's `type` param.
 */
function useUrlFilters(fixedType?: EntryTypeKey): [Filters, (patch: Partial<Filters>) => void] {
  const [params, setParams] = useSearchParams()
  const filters: Filters = {
    ...emptyFilters,
    q: params.get('q') ?? '',
    types: fixedType ? [fixedType] : ((params.get('type')?.split(',').filter(Boolean) ?? []) as Filters['types']),
    tech: params.get('tech')?.split(',').filter(Boolean) ?? [],
    category: params.get('category') ?? '',
    portfolio: params.get('portfolio') ?? '',
    project: params.get('project') ?? '',
    status: params.get('status') ?? '',
    visibility: params.get('visibility') ?? '',
    stage: params.get('stage') ?? '',
    tag: params.get('tag') ?? '',
    author: params.get('author') ?? '',
    verifiedOnly: params.get('verified') === '1',
    sort: (params.get('sort') as Filters['sort']) ?? 'relevance',
  }
  const patch = (p: Partial<Filters>) => {
    const next = { ...filters, ...p, types: fixedType ? [fixedType] : (p.types ?? filters.types) }
    const sp = new URLSearchParams()
    if (next.q) sp.set('q', next.q)
    if (!fixedType && next.types.length) sp.set('type', next.types.join(','))
    if (next.tech.length) sp.set('tech', next.tech.join(','))
    if (next.category) sp.set('category', next.category)
    if (next.portfolio) sp.set('portfolio', next.portfolio)
    if (next.project) sp.set('project', next.project)
    if (next.status) sp.set('status', next.status)
    if (next.visibility) sp.set('visibility', next.visibility)
    if (next.stage) sp.set('stage', next.stage)
    if (next.tag) sp.set('tag', next.tag)
    if (next.author) sp.set('author', next.author)
    if (next.verifiedOnly) sp.set('verified', '1')
    if (next.sort !== 'relevance') sp.set('sort', next.sort)
    setParams(sp, { replace: true })
  }
  return [filters, patch]
}

export default function Browse() {
  const { key } = useParams<{ key?: string }>()
  const fixedType = key && (ENTRY_TYPE_KEYS as string[]).includes(key) ? (key as EntryTypeKey) : undefined

  const { visible, categories, portfolios, currentUser } = useKb()
  const [f, patch] = useUrlFilters(fixedType)
  const internal = isInternal(currentUser.role)

  const results = useMemo(() => applyFilters(visible, f, categories), [visible, f, categories])

  const allTags = useMemo(() => Array.from(new Set(visible.flatMap((e) => e.tags))).sort(), [visible])
  const allAuthors = useMemo(() => Array.from(new Set(visible.map((e) => e.author))).sort(), [visible])
  const allProjects = useMemo(
    () => Array.from(new Set(visible.map((e) => e.project).filter((p): p is string => !!p))).sort(),
    [visible],
  )
  const activeStages = f.types.length === 1 ? typeDef(f.types[0]).stages : undefined
  // the route-fixed type isn't a "filter" the user set — don't count it, don't let Clear all touch it
  const activeCount = activeFilterCount(f) - (fixedType ? 1 : 0)

  const toggleType = (k: (typeof ENTRY_TYPE_KEYS)[number]) =>
    patch({ types: f.types.includes(k) ? f.types.filter((x) => x !== k) : [...f.types, k] })
  const toggleTech = (k: string) => patch({ tech: f.tech.includes(k) ? f.tech.filter((x) => x !== k) : [...f.tech, k] })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      {fixedType && (
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <Monogram type={fixedType} />
          <div>
            <h1 className="text-lg font-semibold">{typeDef(fixedType).plural}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{typeDef(fixedType).blurb}</p>
          </div>
        </div>
      )}

      <aside className="h-fit space-y-5 rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-20">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Filters</h2>
          {activeCount > 0 && (
            <button onClick={() => patch(emptyFilters)} className="text-xs text-slate-500 hover:underline">
              Clear all
            </button>
          )}
        </div>

        {!fixedType && (
          <FacetGroup label="Type">
            {ENTRY_TYPE_KEYS.map((k) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 py-0.5">
                <input type="checkbox" checked={f.types.includes(k)} onChange={() => toggleType(k)} />
                {typeDef(k).label}
              </label>
            ))}
          </FacetGroup>
        )}

        {activeStages && activeStages.length > 0 && (
          <FacetGroup label={typeDef(f.types[0]).stageLabel ?? 'Stage'}>
            <select value={f.stage} onChange={(e) => patch({ stage: e.target.value })} className={input}>
              <option value="">All</option>
              {activeStages.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </FacetGroup>
        )}

        <FacetGroup label="Technology">
          <div className="flex flex-wrap gap-1.5">
            {TECH.map((t) => (
              <button key={t.key} onClick={() => toggleTech(t.key)}>
                <Pill t={f.tech.includes(t.key) ? 'blue' : 'gray'}>{t.label}</Pill>
              </button>
            ))}
          </div>
        </FacetGroup>

        <FacetGroup label="Category">
          <select value={f.category} onChange={(e) => patch({ category: e.target.value })} className={input}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId ? `— ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </FacetGroup>

        <FacetGroup label="Portfolio">
          <select value={f.portfolio} onChange={(e) => patch({ portfolio: e.target.value })} className={input}>
            <option value="">All</option>
            {portfolios.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FacetGroup>

        <FacetGroup label="Project">
          <select value={f.project} onChange={(e) => patch({ project: e.target.value })} className={input}>
            <option value="">All</option>
            {allProjects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FacetGroup>

        <FacetGroup label="Status">
          <select value={f.status} onChange={(e) => patch({ status: e.target.value })} className={input}>
            <option value="">All</option>
            {ENTRY_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </FacetGroup>

        {internal && (
          <FacetGroup label="Visibility">
            <select value={f.visibility} onChange={(e) => patch({ visibility: e.target.value })} className={input}>
              <option value="">All</option>
              <option value="internal">Internal only</option>
              <option value="client">Client-visible</option>
            </select>
          </FacetGroup>
        )}

        <FacetGroup label="Tag">
          <select value={f.tag} onChange={(e) => patch({ tag: e.target.value })} className={input}>
            <option value="">All</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        </FacetGroup>

        {internal && (
          <FacetGroup label="Author">
            <select value={f.author} onChange={(e) => patch({ author: e.target.value })} className={input}>
              <option value="">All</option>
              {allAuthors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </FacetGroup>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={f.verifiedOnly} onChange={(e) => patch({ verifiedOnly: e.target.checked })} />
          Verified only
        </label>
      </aside>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={f.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="Search…"
            className={`${input} flex-1`}
          />
          <select value={f.sort} onChange={(e) => patch({ sort: e.target.value as Filters['sort'] })} className={`${input} w-auto`}>
            <option value="relevance">Most relevant</option>
            <option value="updated">Recently updated</option>
            <option value="created">Newest</option>
            <option value="views">Most read</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </p>

        <div className="stagger space-y-3">
          {results.length === 0 && (
            <Empty
              title="We couldn't find anything matching that"
              hint={f.q ? `Try a broader term, or clear a filter.` : 'Try clearing a filter or broadening your search.'}
            />
          )}
          {results.map((e) => (
            <EntryCard key={e.id} entry={e} showVisibility={internal} query={f.q} />
          ))}
        </div>
      </section>
    </div>
  )
}

function FacetGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-400">{label}</label>
      {children}
    </div>
  )
}
