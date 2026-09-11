import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Markdown, Monogram, Panel, StageChip, StatusChip, Tag, TechChip, VisibilityChip, btn, fmtDate } from '../components/ui'
import { FieldDef, typeDef } from '../kb/schema'
import { useKb } from '../kb/store'
import { canEdit } from '../types'
import { useState } from 'react'

function DetailField({ def, value }: { def: FieldDef; value: string | string[] | undefined }) {
  if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null

  let body: React.ReactNode
  if (def.kind === 'markdown') body = <Markdown source={value as string} />
  else if (def.kind === 'code') body = <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100"><code>{value as string}</code></pre>
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
      <div className="text-xs font-semibold uppercase text-slate-400">{def.label}</div>
      <div className="mt-0.5">{body}</div>
    </div>
  )
}

export default function EntryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { visible, categoryName, currentUser, remove, addComment, revert, countView } = useKb()
  const entry = visible.find((e) => e.id === id)
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (entry) countView(entry.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id])

  if (!entry) {
    return <Panel title="Not found"><p className="p-4 text-sm text-slate-500">This entry does not exist, or is not visible to your role.</p></Panel>
  }

  const def = typeDef(entry.type)
  const manage = canEdit(currentUser.role)
  const related = visible.filter((e) => entry.relatedEntryIds.includes(e.id))

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      <article className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <Monogram type={entry.type} />
            <div>
              <div className="text-xs font-medium text-slate-500">{def.label}</div>
              <h1 className="text-xl font-semibold leading-snug">{entry.title}</h1>
              {entry.summary && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{entry.summary}</p>}
            </div>
          </div>
          {manage && (
            <div className="flex shrink-0 gap-2">
              <Link to={`/edit/${entry.id}`} className={btn.ghost}>Edit</Link>
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
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <StageChip type={entry.type} stage={entry.stage} />
          <StatusChip status={entry.status} />
          <VisibilityChip visibility={entry.visibility} />
          {entry.tech.map((t) => <TechChip key={t} k={t} to={`/browse?tech=${t}`} />)}
          {entry.tags.map((t) => <Tag key={t} name={t} to={`/browse?tag=${t}`} />)}
        </div>

        <Markdown source={entry.content} />

        {def.fields.some((fd) => entry.details[fd.key] !== undefined && entry.details[fd.key] !== '') && (
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-950">
            {def.fields.map((fd) => (
              <DetailField key={fd.key} def={fd} value={entry.details[fd.key]} />
            ))}
          </div>
        )}

        {entry.attachments.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">Attachments</h2>
            <ul className="space-y-1">
              {entry.attachments.map((a) => (
                <li key={a.id} className="text-sm">
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline dark:text-sky-400">
                    📎 {a.name}
                  </a>
                  {a.note && <span className="ml-2 text-xs text-slate-400">{a.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {manage && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">Internal discussion</h2>
            <ul className="space-y-2">
              {entry.comments.map((c) => (
                <li key={c.id} className="rounded-lg bg-slate-50 p-2.5 text-sm dark:bg-slate-950">
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
              <button type="submit" className={btn.ghost}>Post</button>
            </form>
          </div>
        )}
      </article>

      <aside className="space-y-4">
        <Panel title="Details">
          <dl className="space-y-2 p-4 text-sm">
            <Row label="Category" value={categoryName(entry.category)} />
            {entry.portfolio && <Row label="Portfolio" value={entry.portfolio} to={`/browse?portfolio=${encodeURIComponent(entry.portfolio)}`} />}
            {entry.project && <Row label="Project" value={entry.project} to={`/browse?project=${encodeURIComponent(entry.project)}`} />}
            <Row label="Author" value={entry.author} />
            <Row label="Created" value={fmtDate(entry.createdAt)} />
            <Row label="Updated" value={fmtDate(entry.updatedAt)} />
            <Row label="Views" value={String(entry.views)} />
          </dl>
        </Panel>

        {related.length > 0 && (
          <Panel title="Related entries">
            <ul className="space-y-1 p-4">
              {related.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <Monogram type={r.type} size="sm" />
                  <Link to={`/entry/${r.id}`} className="truncate text-sm text-slate-600 hover:underline dark:text-slate-300">
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {manage && entry.versions.length > 0 && (
          <Panel title="Version history" hint="Internal only">
            <ul className="space-y-3 p-4">
              {[...entry.versions].reverse().map((v) => (
                <li key={v.id} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{v.editedBy}</span>{' '}
                      <span className="text-slate-400">{fmtDate(v.editedAt)}</span>
                    </span>
                    {v.id !== entry.versions[entry.versions.length - 1].id && (
                      <button
                        onClick={() => confirm('Revert to this version?') && revert(entry.id, v.id)}
                        className="text-slate-400 hover:text-slate-900 hover:underline dark:hover:text-slate-100"
                      >
                        Revert
                      </button>
                    )}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">{v.summary}</div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </aside>
    </div>
  )
}

function Row({ label, value, to }: { label: string; value: string; to?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium">
        {to ? <Link to={to} className="hover:underline">{value}</Link> : value}
      </dd>
    </div>
  )
}
