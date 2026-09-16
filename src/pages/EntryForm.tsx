import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import FeedbackWidget from '../components/FeedbackWidget'
import LookupPicker, { LookupColumn } from '../components/LookupPicker'
import { useToast } from '../components/Toast'
import {
  EvidenceRow,
  Markdown,
  Monogram,
  PageTitle,
  StageChip,
  StatusChip,
  Tag,
  TechChip,
  VisibilityChip,
  btn,
  input,
} from '../components/ui'
import { EVIDENCE_TYPES, ENTRY_STATUSES, ENTRY_TYPE_KEYS, EntryTypeKey, FieldDef, TECH, TYPE_DECISION_HELPER, typeDef } from '../kb/schema'
import { useKb } from '../kb/store'
import { isSharePointConfigured } from '../kb/sharepoint/config'
import {
  MasterTaskLookupResult,
  searchPortfolios,
  searchProjects,
  searchTasks,
  searchTeamMembers,
  TaskLookupResult,
  TeamMemberLookupResult,
} from '../kb/sharepoint/lookup'
import { Attachment, Details, Entry, Evidence, EntryStatus, REVIEW_INTERVALS, Visibility } from '../types'

const emptyEntry = (type: EntryTypeKey, author: string): Entry => {
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
    author,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: [],
    evidence: [],
    relatedEntryIds: [],
    comments: [],
    feedback: [],
    verification: { state: 'unverified', history: [] },
    versions: [],
    views: 0,
  }
}

// ponytail: prototype has no backend, so files are read into data URLs and kept in
// localStorage with everything else — fine for a few docs, not for a real file store.
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

function DetailInput({
  def,
  value,
  onChange,
  sharePointReady,
  onOpenPersonPicker,
}: {
  def: FieldDef
  value: string | string[] | undefined
  onChange: (v: string | string[]) => void
  sharePointReady: boolean
  onOpenPersonPicker: () => void
}) {
  const rows = def.kind === 'code' ? 10 : def.kind === 'markdown' ? 5 : 2

  if (def.kind === 'person' && sharePointReady) {
    const name = (value as string) ?? ''
    return <LookupField value={name} placeholder="Search team members…" onOpen={onOpenPersonPicker} onClear={() => onChange('')} />
  }
  if (def.kind === 'people' && sharePointReady) {
    const names = Array.isArray(value) ? value : []
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {names.map((name) => (
          <span
            key={name}
            className="flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-inset ring-sky-600"
          >
            {name}
            <button type="button" onClick={() => onChange(names.filter((n) => n !== name))} className="text-white/80 hover:text-white">
              ✕
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={onOpenPersonPicker}
          className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
        >
          + Add
        </button>
      </div>
    )
  }
  // No SharePoint configured — fall back to plain free-text input for 'person'/'people' too.
  if (def.kind === 'person') {
    return <input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={input} />
  }
  if (def.kind === 'people') {
    return (
      <input
        value={Array.isArray(value) ? value.join(', ') : ''}
        onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        placeholder="Comma separated"
        className={input}
      />
    )
  }
  if (def.kind === 'select') {
    return (
      <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={input}>
        <option value="">—</option>
        {def.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
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
  return <textarea value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} rows={rows} className={textareaCls(def.kind)} />
}

const STEPS = ['Type', 'Title & summary', 'Content', 'Evidence', 'Owner & reviewer', 'Visibility & schedule', 'Preview'] as const

const masterTaskIdColumn: LookupColumn<MasterTaskLookupResult> = { label: 'ID', render: (item) => item.code ?? '—' }
const masterTaskColumns: LookupColumn<MasterTaskLookupResult>[] = [
  { label: 'Due', render: (item) => (item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—') },
  { label: '% Complete', render: (item) => (item.percentComplete != null ? `${Math.round(item.percentComplete * 100)}%` : '—') },
]

export default function EntryForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { entries, categories, portfolios, users, save, submitForReview, currentUser } = useKb()
  const existing = id ? entries.find((e) => e.id === id) : undefined

  const [form, setForm] = useState<Entry>(() => existing ?? emptyEntry('kt', currentUser.name))
  const [tagInput, setTagInput] = useState((existing ?? emptyEntry('kt', currentUser.name)).tags.join(', '))
  const [step, setStep] = useState(0)
  const [fileError, setFileError] = useState('')
  const [reviewInterval, setReviewInterval] = useState(existing?.verification.reviewIntervalDays ? String(existing.verification.reviewIntervalDays) : '90')
  const [activePicker, setActivePicker] = useState<
    'portfolio' | 'project' | 'task' | 'people' | { field: string; multi: boolean } | null
  >(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const def = typeDef(form.type)
  const sharePointReady = isSharePointConfigured()

  const allProjects = useMemo(() => Array.from(new Set(entries.map((e) => e.project).filter((p): p is string => !!p))).sort(), [entries])
  const allTasks = useMemo(() => Array.from(new Set(entries.map((e) => e.task).filter((t): t is string => !!t))).sort(), [entries])
  const potentialReviewers = users.filter((u) => (u.role === 'admin' || u.role === 'editor') && u.name !== form.author)

  const set = <K extends keyof Entry>(key: K, value: Entry[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setDetail = (key: string, value: Details[string]) => setForm((f) => ({ ...f, details: { ...f.details, [key]: value } }))

  const changeType = (type: EntryTypeKey) => {
    const nd = typeDef(type)
    setForm((f) => ({ ...f, type, stage: nd.stages?.[0]?.key, details: {} }))
  }

  const toggleTech = (k: string) => setForm((f) => ({ ...f, tech: f.tech.includes(k) ? f.tech.filter((x) => x !== k) : [...f.tech, k] }))
  const toggleTaggedUser = (name: string) =>
    setForm((f) => ({
      ...f,
      taggedUsers: (f.taggedUsers ?? []).includes(name)
        ? (f.taggedUsers ?? []).filter((x) => x !== name)
        : [...(f.taggedUsers ?? []), name],
    }))

  const addEvidence = (partial: Omit<Evidence, 'id'>) =>
    setForm((f) => ({ ...f, evidence: [...f.evidence, { ...partial, id: `ev${Date.now()}${Math.random().toString(36).slice(2, 5)}` }] }))
  const removeEvidence = (evId: string) => setForm((f) => ({ ...f, evidence: f.evidence.filter((e) => e.id !== evId) }))

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
  const removeAttachment = (attId: string) => setForm((f) => ({ ...f, attachments: f.attachments.filter((a) => a.id !== attId) }))

  const finalize = (tags: string[]) => ({
    ...form,
    tags,
    verification: { ...form.verification, reviewIntervalDays: Number(reviewInterval) || undefined },
  })

  const saveDraft = () => {
    const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
    const payload = finalize(tags)
    save(payload, existing ? 'Saved changes' : undefined)
    toast('Saved as draft.', 'success')
    navigate(`/entry/${payload.id}`)
  }

  const submitReview = () => {
    if (!form.title.trim()) {
      setStep(1)
      toast('Add a title before submitting.', 'error')
      return
    }
    const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
    const payload = finalize(tags)
    save({ ...payload, status: 'published' }, existing ? 'Submitted for review' : 'Submitted for review')
    submitForReview(payload.id, form.reviewer)
    toast('Submitted for review.', 'success')
    navigate(`/entry/${payload.id}`)
  }

  const canGoNext = step === 1 ? form.title.trim().length > 0 : true

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <PageTitle>{existing ? 'Edit entry' : 'Share knowledge'}</PageTitle>

      {/* step tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STEPS.map((label, i) => (
          <button
            key={label}
            onClick={() => setStep(i)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              i === step
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : i < step
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <div key={step} className="animate-fade-up space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {step === 0 && (
          <div>
            <p className="mb-1 text-sm font-semibold">What are you sharing?</p>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Pick the shape that fits — this decides which fields you fill in next.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ENTRY_TYPE_KEYS.map((t) => {
                const td = typeDef(t)
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => changeType(t)}
                    disabled={!!existing}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition disabled:opacity-50 ${
                      form.type === t
                        ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800'
                        : 'border-slate-200 hover:border-slate-400 dark:border-slate-700'
                    }`}
                  >
                    <Monogram type={t} size="sm" />
                    <span>
                      <span className="block text-sm font-medium">{td.label}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{td.blurb}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <details className="mt-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                Not sure which type to choose?
              </summary>
              <ul className="space-y-1 px-3 pb-3 text-xs text-slate-500 dark:text-slate-400">
                {TYPE_DECISION_HELPER.map((h) => (
                  <li key={h.type}>
                    &ldquo;{h.prompt}&rdquo; → <span className="font-medium text-slate-700 dark:text-slate-200">{typeDef(h.type).label}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Title" required>
              <input autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} className={input} />
            </Field>
            <Field label="Summary" hint="One or two sentences — shows on cards and search results">
              <input value={form.summary} onChange={(e) => set('summary', e.target.value)} className={input} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Content" hint="Markdown supported">
              <textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={6} className={input} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select value={form.category} onChange={(e) => set('category', e.target.value)} className={input}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? `— ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tags" hint="Comma separated">
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} className={input} />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Portfolio">
                {sharePointReady ? (
                  <LookupField value={form.portfolio} placeholder="Search portfolios…" onOpen={() => setActivePicker('portfolio')} onClear={() => set('portfolio', undefined)} />
                ) : (
                  <select value={form.portfolio ?? ''} onChange={(e) => set('portfolio', e.target.value || undefined)} className={input}>
                    <option value="">—</option>
                    {portfolios.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Project">
                {sharePointReady ? (
                  <LookupField value={form.project} placeholder="Search projects…" onOpen={() => setActivePicker('project')} onClear={() => set('project', undefined)} />
                ) : (
                  <>
                    <input
                      list="project-suggestions"
                      value={form.project ?? ''}
                      onChange={(e) => set('project', e.target.value || undefined)}
                      className={input}
                    />
                    <datalist id="project-suggestions">
                      {allProjects.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Task" hint={sharePointReady ? 'Pick an existing task from a team list' : 'e.g. a Jira/DevOps id'}>
                {sharePointReady ? (
                  <LookupField
                    value={form.task}
                    placeholder="Search tasks…"
                    onOpen={() => setActivePicker('task')}
                    onClear={() => {
                      set('task', undefined)
                      set('taskListTitle', undefined)
                      set('taskItemId', undefined)
                    }}
                  />
                ) : (
                  <>
                    <input
                      list="task-suggestions"
                      value={form.task ?? ''}
                      onChange={(e) => set('task', e.target.value || undefined)}
                      className={input}
                    />
                    <datalist id="task-suggestions">
                      {allTasks.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
            </div>

            {activePicker === 'portfolio' && (
              <LookupPicker
                title="Select portfolio"
                placeholder="Search Master Tasks…"
                search={searchPortfolios}
                leadingColumn={masterTaskIdColumn}
                columns={masterTaskColumns}
                onSelect={(item: MasterTaskLookupResult) => set('portfolio', item.title)}
                onClose={() => setActivePicker(null)}
              />
            )}
            {activePicker === 'project' && (
              <LookupPicker
                title="Select project"
                placeholder="Search Master Tasks…"
                search={searchProjects}
                leadingColumn={masterTaskIdColumn}
                columns={masterTaskColumns}
                onSelect={(item: MasterTaskLookupResult) => set('project', item.title)}
                onClose={() => setActivePicker(null)}
              />
            )}
            {activePicker === 'task' && (
              <LookupPicker
                title="Add existing task"
                placeholder="Search across team task lists…"
                subtitleLabel="List"
                search={searchTasks}
                onSelect={(item: TaskLookupResult) => {
                  set('task', item.title)
                  set('taskListTitle', item.listTitle)
                  set('taskItemId', item.itemId)
                }}
                onClose={() => setActivePicker(null)}
              />
            )}
            {activePicker === 'people' && (
              <LookupPicker
                title="Tag people"
                placeholder="Search team members…"
                subtitleLabel="Company"
                search={searchTeamMembers}
                isSelected={(item: TeamMemberLookupResult) => (form.taggedUsers ?? []).includes(item.title)}
                onToggle={(item: TeamMemberLookupResult) => toggleTaggedUser(item.title)}
                onClose={() => setActivePicker(null)}
              />
            )}
            {/* Any type's field can ask for a real person/people (see schema.ts's 'person'/'people' kinds) —
                one shared picker here, driven by which field is currently open rather than one per field. */}
            {activePicker !== null && typeof activePicker === 'object' && activePicker.multi && (
              <LookupPicker
                title="Select people"
                placeholder="Search team members…"
                subtitleLabel="Company"
                search={searchTeamMembers}
                isSelected={(item: TeamMemberLookupResult) => {
                  const current = form.details[activePicker.field]
                  return Array.isArray(current) && current.includes(item.title)
                }}
                onToggle={(item: TeamMemberLookupResult) => {
                  const current = form.details[activePicker.field]
                  const arr = Array.isArray(current) ? current : []
                  setDetail(activePicker.field, arr.includes(item.title) ? arr.filter((n) => n !== item.title) : [...arr, item.title])
                }}
                onClose={() => setActivePicker(null)}
              />
            )}
            {activePicker !== null && typeof activePicker === 'object' && !activePicker.multi && (
              <LookupPicker
                title="Select person"
                placeholder="Search team members…"
                subtitleLabel="Company"
                search={searchTeamMembers}
                onSelect={(item: TeamMemberLookupResult) => setDetail(activePicker.field, item.title)}
                onClose={() => setActivePicker(null)}
              />
            )}

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

            <Field label="Tag people" hint={sharePointReady ? 'Loop in real team members' : 'Loop in other users on this entry'}>
              {sharePointReady ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(form.taggedUsers ?? []).map((name) => (
                    <span
                      key={name}
                      className="flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-inset ring-sky-600"
                    >
                      {name}
                      <button type="button" onClick={() => toggleTaggedUser(name)} className="text-white/80 hover:text-white">
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setActivePicker('people')}
                    className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
                  >
                    + Add people
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {users
                    .filter((u) => u.name !== currentUser.name)
                    .map((u) => (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => toggleTaggedUser(u.name)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                          (form.taggedUsers ?? []).includes(u.name)
                            ? 'bg-sky-600 text-white ring-sky-600'
                            : 'bg-white text-slate-600 ring-slate-300 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-700'
                        }`}
                      >
                        {u.name}
                      </button>
                    ))}
                </div>
              )}
            </Field>

            {def.stages && def.stages.length > 0 && (
              <Field label={def.stageLabel ?? 'Stage'}>
                <select value={form.stage ?? ''} onChange={(e) => set('stage', e.target.value)} className={input}>
                  {def.stages.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
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
                        <DetailInput
                          def={fd}
                          value={form.details[fd.key]}
                          onChange={(v) => setDetail(fd.key, v)}
                          sharePointReady={sharePointReady}
                          onOpenPersonPicker={() => setActivePicker({ field: fd.key, multi: fd.kind === 'people' })}
                        />
                      </Field>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold">Evidence</p>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                Links to real material only — a benchmark, a PR, docs, a screenshot. This is what lets someone trust this without re-checking it.
              </p>
              <EvidenceEditor evidence={form.evidence} onAdd={addEvidence} onRemove={removeEvidence} />
            </div>

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
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Field label="Owner" hint="Who this knowledge belongs to">
              <input value={form.author} onChange={(e) => set('author', e.target.value)} className={input} />
            </Field>
            <Field label="Reviewer" hint="Who should review this before it's marked verified">
              <select value={form.reviewer ?? ''} onChange={(e) => set('reviewer', e.target.value || undefined)} className={input}>
                <option value="">No one assigned yet</option>
                {potentialReviewers.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Status">
                <select value={form.status} onChange={(e) => set('status', e.target.value as EntryStatus)} className={input}>
                  {ENTRY_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Visibility">
                <select value={form.visibility} onChange={(e) => set('visibility', e.target.value as Visibility)} className={input}>
                  <option value="internal">Internal only</option>
                  <option value="client">Visible to clients</option>
                </select>
              </Field>
            </div>
            <Field label="Requested review cadence" hint="Suggested to the reviewer — they can change it on approval">
              <select value={reviewInterval} onChange={(e) => setReviewInterval(e.target.value)} className={input}>
                {REVIEW_INTERVALS.map((r) => (
                  <option key={r.key} value={r.days ?? ''}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">Preview</p>
            <div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Monogram type={form.type} />
                <div>
                  <div className="text-xs font-medium text-slate-500">{def.label}</div>
                  <h2 className="text-lg font-bold leading-snug">{form.title || 'Untitled entry'}</h2>
                  {form.summary && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{form.summary}</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <StageChip type={form.type} stage={form.stage} />
                <StatusChip status={form.status} />
                <VisibilityChip visibility={form.visibility} />
                {form.tech.map((t) => (
                  <TechChip key={t} k={t} />
                ))}
                {tagInput
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => (
                    <Tag key={t} name={t} />
                  ))}
              </div>
              <div className="mt-4">
                <Markdown source={form.content} />
              </div>
              {form.evidence.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {form.evidence.map((e) => (
                    <EvidenceRow key={e.id} e={e} />
                  ))}
                </div>
              )}
              <div className="mt-4">
                <FeedbackWidget entryId={form.id} feedback={[]} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <div>
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className={btn.ghost}>
              Back
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(-1)} className={btn.ghost}>
            Cancel
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" disabled={!canGoNext} onClick={() => setStep((s) => s + 1)} className={btn.primary}>
              Next
            </button>
          ) : (
            <>
              <button type="button" onClick={saveDraft} className={btn.ghost}>
                Save draft
              </button>
              <button type="button" onClick={submitReview} className={btn.primary}>
                Submit for review
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function EvidenceEditor({
  evidence,
  onAdd,
  onRemove,
}: {
  evidence: Evidence[]
  onAdd: (e: Omit<Evidence, 'id'>) => void
  onRemove: (id: string) => void
}) {
  const [type, setType] = useState<Evidence['type']>('url')
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  const add = () => {
    if (!label.trim() || !url.trim()) return
    onAdd({ type, label: label.trim(), url: url.trim() })
    setLabel('')
    setUrl('')
  }

  return (
    <div className="space-y-2">
      {evidence.map((e) => (
        <div key={e.id} className="flex items-center gap-2">
          <div className="flex-1">
            <EvidenceRow e={e} />
          </div>
          <button onClick={() => onRemove(e.id)} className="shrink-0 text-xs text-rose-600 hover:underline">
            Remove
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
        <select value={type} onChange={(e) => setType(e.target.value as Evidence['type'])} className={`${input} w-auto`}>
          {EVIDENCE_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.icon} {t.label}
            </option>
          ))}
        </select>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className={`${input} w-40`} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={`${input} flex-1`} />
        <button type="button" onClick={add} className={btn.ghost}>
          Add
        </button>
      </div>
    </div>
  )
}

function LookupField({ value, placeholder, onOpen, onClear }: { value?: string; placeholder: string; onOpen: () => void; onClear: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onOpen}
        className={`${input} flex items-center justify-between text-left ${value ? '' : 'text-slate-400 dark:text-slate-500'}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <span className="shrink-0 text-xs text-slate-400">🔍</span>
      </button>
      {value && (
        <button type="button" onClick={onClear} className="shrink-0 text-xs text-slate-400 hover:text-rose-600" title="Clear">
          ✕
        </button>
      )}
    </div>
  )
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
