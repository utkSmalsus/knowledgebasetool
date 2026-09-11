import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { btn, input } from '../components/ui'
import { ENTRY_STATUSES, ENTRY_TYPE_KEYS, FieldDef, TECH, typeDef } from '../kb/schema'
import { useKb } from '../kb/store'
import { Attachment, Details, Entry, EntryStatus, Visibility } from '../types'
import { EntryTypeKey } from '../kb/schema'

const emptyEntry = (type: EntryTypeKey): Entry => {
  const def = typeDef(type)
  return {
    id: `e${Date.now()}`,
    type,
    title: '',
    summary: '',
    content: '',
    details: {},
    stage: def.stages?.[0]?.key,
    category: 'eng',
    tech: [],
    tags: [],
    status: 'draft',
    visibility: 'internal',
    author: 'You',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: [],
    relatedEntryIds: [],
    comments: [],
    versions: [],
    views: 0,
  }
}

// ponytail: prototype has no backend, so files are read into data URLs and kept in
// localStorage with everything else — fine for a few docs, not for a real file store.
// Real upload/storage arrives with the backend (see CLAUDE_CODE_PROMPT.md item 4).
const MAX_FILE_BYTES = 5 * 1024 * 1024
const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)
const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

const textareaCls = (kind: FieldDef['kind']) => `${input} ${kind === 'code' ? 'font-mono text-xs' : ''}`

function DetailInput({ def, value, onChange }: { def: FieldDef; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const rows = def.kind === 'code' ? 10 : def.kind === 'markdown' ? 5 : 2

  if (def.kind === 'select') {
    return (
      <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={input}>
        <option value="">—</option>
        {def.options?.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    )
  }
  if (def.kind === 'date') {
    return <input type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={input} />
  }
  if (def.kind === 'text') {
    return <input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={input} />
  }
  if (def.kind === 'list') {
    return (
      <input
        value={Array.isArray(value) ? value.join(', ') : ''}
        onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        placeholder="Comma separated"
        className={input}
      />
    )
  }
  if (def.kind === 'links') {
    return (
      <textarea
        value={Array.isArray(value) ? value.join('\n') : ''}
        onChange={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
        rows={3}
        placeholder="One URL per line"
        className={input}
      />
    )
  }
  // textarea | markdown | code
  return (
    <textarea
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className={textareaCls(def.kind)}
    />
  )
}

export default function EntryForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { entries, categories, portfolios, save, currentUser } = useKb()
  const existing = id ? entries.find((e) => e.id === id) : undefined

  const [form, setForm] = useState<Entry>(() => existing ?? { ...emptyEntry('article'), author: currentUser.name })
  const [tagInput, setTagInput] = useState((existing ?? emptyEntry('article')).tags.join(', '))
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const def = typeDef(form.type)

  const allProjects = useMemo(
    () => Array.from(new Set(entries.map((e) => e.project).filter((p): p is string => !!p))).sort(),
    [entries],
  )

  const set = <K extends keyof Entry>(key: K, value: Entry[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setDetail = (key: string, value: Details[string]) => setForm((f) => ({ ...f, details: { ...f.details, [key]: value } }))

  const changeType = (type: EntryTypeKey) => {
    const nd = typeDef(type)
    setForm((f) => ({ ...f, type, stage: nd.stages?.[0]?.key, details: {} }))
  }

  const toggleTech = (k: string) => setForm((f) => ({ ...f, tech: f.tech.includes(k) ? f.tech.filter((x) => x !== k) : [...f.tech, k] }))

  const onFilesChosen = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    setFileError('')
    const oversized = Array.from(fileList).find((f) => f.size > MAX_FILE_BYTES)
    if (oversized) {
      setFileError(`"${oversized.name}" is over 5 MB — too big for this prototype's local storage.`)
      return
    }
    const uploaded: Attachment[] = await Promise.all(
      Array.from(fileList).map(async (file) => ({
        id: `att${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        url: await readAsDataUrl(file),
        note: sizeLabel(file.size),
      })),
    )
    setForm((f) => ({ ...f, attachments: [...f.attachments, ...uploaded] }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (attId: string) =>
    setForm((f) => ({ ...f, attachments: f.attachments.filter((a) => a.id !== attId) }))

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
    save({ ...form, tags }, existing ? 'Edited entry' : undefined)
    navigate(`/entry/${form.id}`)
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6 pb-16">
      <h1 className="text-lg font-semibold">{existing ? 'Edit entry' : 'New entry'}</h1>

      <div>
        <Label>Type</Label>
        <div className="flex flex-wrap gap-2">
          {ENTRY_TYPE_KEYS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => changeType(t)}
              disabled={!!existing}
              title={typeDef(t).blurb}
              className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${
                form.type === t
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border border-slate-300 dark:border-slate-700'
              }`}
            >
              {typeDef(t).label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{def.blurb}</p>
      </div>

      <Field label="Title">
        <input required value={form.title} onChange={(e) => set('title', e.target.value)} className={input} />
      </Field>

      <Field label="Summary" hint="One or two sentences — shows on cards and search results">
        <input value={form.summary} onChange={(e) => set('summary', e.target.value)} className={input} />
      </Field>

      <Field label="Content" hint="Markdown supported">
        <textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={6} className={input} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <select value={form.category} onChange={(e) => set('category', e.target.value)} className={input}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.parentId ? `— ${c.name}` : c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Tags" hint="Comma separated">
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} className={input} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Portfolio" hint="Business line or client account this belongs to">
          <select value={form.portfolio ?? ''} onChange={(e) => set('portfolio', e.target.value || undefined)} className={input}>
            <option value="">—</option>
            {portfolios.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Project" hint="Engagement or initiative name">
          <input
            list="project-suggestions"
            value={form.project ?? ''}
            onChange={(e) => set('project', e.target.value || undefined)}
            className={input}
          />
          <datalist id="project-suggestions">
            {allProjects.map((p) => <option key={p} value={p} />)}
          </datalist>
        </Field>
      </div>

      <Field label="Technology / domain">
        <div className="flex flex-wrap gap-1.5">
          {TECH.map((t) => (
            <button
              type="button"
              key={t.key}
              onClick={() => toggleTech(t.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                form.tech.includes(t.key)
                  ? 'bg-sky-600 text-white ring-sky-600'
                  : 'bg-white text-slate-600 ring-slate-300 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Status">
          <select value={form.status} onChange={(e) => set('status', e.target.value as EntryStatus)} className={input}>
            {ENTRY_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Visibility">
          <select value={form.visibility} onChange={(e) => set('visibility', e.target.value as Visibility)} className={input}>
            <option value="internal">Internal only</option>
            <option value="client">Visible to clients</option>
          </select>
        </Field>
      </div>

      {def.stages && def.stages.length > 0 && (
        <Field label={def.stageLabel ?? 'Stage'}>
          <select value={form.stage ?? ''} onChange={(e) => set('stage', e.target.value)} className={input}>
            {def.stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
      )}

      {def.fields.length > 0 && (
        <div className="space-y-4 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
          <div className="text-sm font-semibold">{def.label} details</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {def.fields.map((fd) => (
              <div key={fd.key} className={fd.half ? '' : 'sm:col-span-2'}>
                <Field label={fd.label} hint={fd.hint} required={fd.required}>
                  <DetailInput def={fd} value={form.details[fd.key]} onChange={(v) => setDetail(fd.key, v)} />
                </Field>
              </div>
            ))}
          </div>
        </div>
      )}

      <Field label="Attachments" hint="Docs, screenshots, PDFs — up to 5 MB each">
        <div className="space-y-2">
          {form.attachments.length > 0 && (
            <ul className="space-y-1.5">
              {form.attachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  <span className="truncate">
                    📎 {a.name} <span className="text-xs text-slate-400">{a.note}</span>
                  </span>
                  <button type="button" onClick={() => removeAttachment(a.id)} className="shrink-0 text-xs text-rose-600 hover:underline">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => onFilesChosen(e.target.files)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700 dark:text-slate-300 dark:file:bg-slate-100 dark:file:text-slate-900"
          />
          {fileError && <p className="text-xs text-rose-600">{fileError}</p>}
        </div>
      </Field>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => navigate(-1)} className={btn.ghost}>Cancel</button>
        <button type="submit" className={btn.primary}>{existing ? 'Save changes' : 'Publish entry'}</button>
      </div>
    </form>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">{children}</span>
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase text-slate-500">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {hint && <span className="block text-xs font-normal normal-case text-slate-400">{hint}</span>}
      {children}
    </label>
  )
}
