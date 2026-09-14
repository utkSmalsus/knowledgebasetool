import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import EntryCard from '../components/EntryCard'
import FeedbackWidget from '../components/FeedbackWidget'
import VerificationPanel from '../components/VerificationPanel'
import VersionHistory from '../components/VersionHistory'
import {
  EvidenceRow,
  Markdown,
  Monogram,
  Panel,
  SectionTitle,
  Tag,
  TechChip,
  VerificationBadge,
  btn,
  fmtDate,
} from '../components/ui'
import { recommend } from '../kb/recommend'
import { FieldDef, stageFor, typeDef } from '../kb/schema'
import { useKb } from '../kb/store'
import { canEdit } from '../types'

const WHEN_TO_USE_KEYS = ['recommendedWhen', 'avoidWhen', 'limitations']

function DetailField({ def, value }: { def: FieldDef; value: string | string[] | undefined }) {
  if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null

  let body: React.ReactNode
  if (def.kind === 'markdown') body = <Markdown source={value as string} />
  else if (def.kind === 'code')
    body = (
      <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100 dark:bg-black">
        <code>{value as string}</code>
      </pre>
    )
  else if (def.kind === 'links')
    body = (
      <ul className="space-y-1">
        {(value as string[]).map((url) => (
          <li key={url}>
            <a href={url} target="_blank" rel="noreferrer" className="text-sm text-sky-700 hover:underline dark:text-sky-400">
              {url}
            </a>
          </li>
        ))}
      </ul>
    )
  else if (def.kind === 'list') body = <p className="text-sm">{(value as string[]).join(', ')}</p>
  else if (def.kind === 'date') body = <p className="text-sm">{fmtDate(value as string)}</p>
  else body = <p className="whitespace-pre-wrap text-sm">{value as string}</p>

  return (
    <div className={def.half ? '' : 'sm:col-span-2'}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{def.label}</div>
      <div className="mt-1">{body}</div>
    </div>
  )
}

export default function EntryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  // Saved & recent is disabled — markViewed/isSaved/toggleSaved intentionally unused, see App.tsx, Layout.tsx, CommandPalette.tsx, Dashboard.tsx, Saved.tsx
  const { visible, categoryName, currentUser, remove, addComment, countView /*, markViewed, isSaved, toggleSaved */ } = useKb()
  const entry = visible.find((e) => e.id === id)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (entry) {
      countView(entry.id)
      // markViewed(entry.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id])

  if (!entry) {
    return (
      <Panel title="Not found">
        <p className="p-4 text-sm text-slate-500">This entry does not exist, or is not visible to your role.</p>
      </Panel>
    )
  }

  const def = typeDef(entry.type)
  const manage = canEdit(currentUser.role)
  const linkedRelated = visible.filter((e) => entry.relatedEntryIds.includes(e.id))
  const related = linkedRelated.length > 0 ? linkedRelated : recommend(visible, [entry], new Set([entry.id]), 4)

  const stage = stageFor(entry.type, entry.stage)
  const mainFields = def.fields.filter((f) => !WHEN_TO_USE_KEYS.includes(f.key))
  const whenFields = def.fields.filter((f) => WHEN_TO_USE_KEYS.includes(f.key) && entry.details[f.key])
  const hasMainFields = mainFields.some((fd) => entry.details[fd.key] !== undefined && entry.details[fd.key] !== '')

  return (
    <div className="space-y-5">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link to="/" className="hover:text-slate-600 dark:hover:text-slate-300">
          Home
        </Link>
        <span>/</span>
        <Link to={`/type/${entry.type}`} className="hover:text-slate-600 dark:hover:text-slate-300">
          {def.plural}
        </Link>
        <span>/</span>
        <span className="truncate text-slate-500 dark:text-slate-400">{entry.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        {/* ---------------- reading column (document, not a card) ---------------- */}
        <article className="animate-fade-up min-w-0 max-w-3xl space-y-6">
          <header className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <Monogram type={entry.type} />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-500">{def.label}</div>
                  <h1 className="text-2xl font-bold leading-tight tracking-tight">{entry.title}</h1>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                {/* Saved & recent is disabled — see App.tsx, Layout.tsx, CommandPalette.tsx, Dashboard.tsx, Saved.tsx
                <button
                  onClick={() => toggleSaved(entry.id)}
                  title={isSaved(entry.id) ? 'Remove from saved' : 'Save for later'}
                  className={btn.ghost}
                >
                  {isSaved(entry.id) ? '★ Saved' : '☆ Save'}
                </button>
                */}
                {manage && (
                  <>
                    <Link to={`/edit/${entry.id}`} className={btn.ghost}>
                      Edit
                    </Link>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${entry.title}"? This cannot be undone.`)) {
                          remove(entry.id)
                          navigate('/browse')
                        }
                      }}
                      className={btn.danger}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {entry.summary && <p className="text-base text-slate-600 dark:text-slate-400">{entry.summary}</p>}

            {/* the one strong trust indicator — deeper detail lives in the sidebar panel */}
            <VerificationBadge entry={entry} />

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {entry.tech.map((t) => (
                <TechChip key={t} k={t} to={`/browse?tech=${t}`} />
              ))}
              {entry.tags.map((t) => (
                <Tag key={t} name={t} to={`/browse?tag=${t}`} />
              ))}
            </div>
          </header>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          <Markdown source={entry.content} />

          {hasMainFields && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {mainFields.map((fd) => (
                <DetailField key={fd.key} def={fd} value={entry.details[fd.key]} />
              ))}
            </div>
          )}

          {whenFields.length > 0 && (
            <section>
              <SectionTitle className="mb-3">When (not) to use this</SectionTitle>
              <div className="space-y-4">
                {whenFields.map((fd) => (
                  <div key={fd.key}>
                    <div
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        fd.key === 'recommendedWhen'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : fd.key === 'avoidWhen'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {fd.key === 'recommendedWhen' ? '✓ ' : fd.key === 'avoidWhen' ? '✕ ' : '⚠ '}
                      {fd.label}
                    </div>
                    <div className="mt-1">
                      <Markdown source={entry.details[fd.key] as string} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(entry.evidence.length > 0 || entry.attachments.length > 0) && (
            <section>
              <SectionTitle className="mb-3">Evidence &amp; attachments</SectionTitle>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {entry.evidence.map((e) => (
                  <EvidenceRow key={e.id} e={e} />
                ))}
                {entry.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800/60"
                  >
                    <span aria-hidden>📎</span>
                    <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{a.name}</span>
                    {a.note && <span className="shrink-0 text-xs text-slate-400">{a.note}</span>}
                  </a>
                ))}
              </div>
            </section>
          )}

          <FeedbackWidget entryId={entry.id} feedback={entry.feedback} />

          {manage && (
            <section>
              <SectionTitle className="mb-3">Internal discussion</SectionTitle>
              <ul className="space-y-2">
                {entry.comments.map((c) => (
                  <li key={c.id} className="rounded-lg bg-slate-50 p-2.5 text-sm dark:bg-slate-900">
                    <span className="font-medium">{c.author}</span>{' '}
                    <span className="text-xs text-slate-400">{fmtDate(c.createdAt)}</span>
                    <div className="mt-0.5">{c.body}</div>
                  </li>
                ))}
                {entry.comments.length === 0 && <li className="text-sm text-slate-400">No comments yet.</li>}
              </ul>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!comment.trim()) return
                  addComment(entry.id, comment.trim())
                  setComment('')
                }}
              >
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add an internal comment…"
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
                <button type="submit" className={btn.ghost}>
                  Post
                </button>
              </form>
            </section>
          )}
        </article>

        {/* ---------------- context rail ---------------- */}
        <aside className="space-y-4">
          <VerificationPanel entry={entry} canManage={manage} />

          <Panel title="Details">
            <dl className="space-y-2 p-4 text-sm">
              <Row label="Status" value={entry.status === 'draft' ? 'Draft' : entry.status === 'archived' ? 'Archived' : 'Published'} />
              <Row label="Visibility" value={entry.visibility === 'client' ? 'Client-visible' : 'Internal only'} />
              {stage && <Row label={def.stageLabel ?? 'Stage'} value={stage.label} />}
              <Row label="Category" value={categoryName(entry.category)} />
              {entry.portfolio && (
                <Row label="Portfolio" value={entry.portfolio} to={`/browse?portfolio=${encodeURIComponent(entry.portfolio)}`} />
              )}
              {entry.project && <Row label="Project" value={entry.project} to={`/browse?project=${encodeURIComponent(entry.project)}`} />}
              {entry.task && <Row label="Task" value={entry.task} to={`/browse?task=${encodeURIComponent(entry.task)}`} />}
              <Row label="Author" value={entry.author} />
              {entry.reviewer && <Row label="Reviewer" value={entry.reviewer} />}
              <Row label="Updated" value={fmtDate(entry.updatedAt)} />
              <Row label="Views" value={String(entry.views)} />
            </dl>
            {entry.taggedUsers && entry.taggedUsers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 p-4 pt-3 text-sm dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Tagged:</span>
                {entry.taggedUsers.map((name) => (
                  <Link
                    key={name}
                    to={`/browse?taggedUser=${encodeURIComponent(name)}`}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium hover:underline dark:bg-slate-800"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {related.length > 0 && (
            <Panel title="Related knowledge">
              <div className="space-y-2 p-3">
                {related.map((r) => (
                  <EntryCard key={r.id} entry={r} compact />
                ))}
              </div>
            </Panel>
          )}

          {manage && entry.versions.length > 0 && (
            <Panel title="Version history" hint="Internal only">
              <VersionHistory entryId={entry.id} versions={entry.versions} />
            </Panel>
          )}
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value, to }: { label: string; value: string; to?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium">
        {to ? (
          <Link to={to} className="hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
