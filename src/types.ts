import { EntryTypeKey } from './kb/schema'

export type EntryStatus = 'draft' | 'published' | 'archived'
export type Visibility = 'internal' | 'client'
export type Role = 'admin' | 'editor' | 'viewer' | 'client'

/** Type-specific field values, keyed by FieldDef.key from the registry. */
export type Details = Record<string, string | string[] | undefined>

export interface Comment {
  id: string
  author: string
  body: string
  createdAt: string
}

export interface Version {
  id: string
  editedBy: string
  editedAt: string
  summary: string
  /** Enough of the entry to restore it, and to diff against the next version. */
  snapshot: Pick<
    Entry,
    | 'title'
    | 'summary'
    | 'content'
    | 'details'
    | 'stage'
    | 'tags'
    | 'tech'
    | 'status'
    | 'visibility'
    | 'portfolio'
    | 'project'
    | 'task'
    | 'taggedUsers'
  >
}

export interface Attachment {
  id: string
  name: string
  url: string
  note?: string
}

// ---------------------------------------------------------------------------
// Trust layer: verification, evidence, feedback. This is what turns a wiki
// into knowledge people can act on without re-checking it themselves.
// ---------------------------------------------------------------------------

export type VerificationState =
  | 'unverified'
  | 'in_review'
  | 'verified'
  | 'partially_verified'
  | 'needs_update'
  | 'deprecated'

export interface VerificationChecks {
  contentReviewed: boolean
  evidenceChecked: boolean
  approachValidated: boolean
}

export type ReviewAction =
  | 'submitted'
  | 'approved'
  | 'partially_approved'
  | 'changes_requested'
  | 'rejected'
  | 'marked_needs_update'
  | 'deprecated'

export interface ReviewEvent {
  id: string
  action: ReviewAction
  by: string
  at: string
  note?: string
}

export interface Verification {
  state: VerificationState
  /** Who this was routed to for review — set on submit, cleared on decision. */
  reviewer?: string
  submittedAt?: string
  verifiedBy?: string
  verifiedAt?: string
  /** How often this needs re-checking. Undefined = no scheduled re-review. */
  reviewIntervalDays?: number
  nextReviewAt?: string
  checks?: VerificationChecks
  /** Full audit trail — every submit/approve/reject/expire-driven change. */
  history: ReviewEvent[]
}

export const REVIEW_INTERVALS: { key: string; label: string; days?: number }[] = [
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: '6m', label: '6 months', days: 182 },
  { key: '1y', label: '1 year', days: 365 },
  { key: 'none', label: 'No scheduled re-review', days: undefined },
]

export function isExpired(v: Verification | undefined, now = Date.now()): boolean {
  if (!v?.nextReviewAt) return false
  return (v.state === 'verified' || v.state === 'partially_verified') && new Date(v.nextReviewAt).getTime() < now
}

export function daysUntil(iso: string | undefined, now = Date.now()): number | undefined {
  if (!iso) return undefined
  return Math.ceil((new Date(iso).getTime() - now) / 86400000)
}

export const emptyVerification = (): Verification => ({ state: 'unverified', history: [] })

export type EvidenceType = 'url' | 'pr' | 'issue' | 'benchmark' | 'doc' | 'screenshot' | 'reference'

export interface Evidence {
  id: string
  type: EvidenceType
  label: string
  url: string
}

export type FeedbackVerdict = 'yes' | 'partial' | 'no'
export type FeedbackReason = 'outdated' | 'incorrect' | 'missing_info' | 'broken' | 'duplicate' | 'other'

export interface Feedback {
  id: string
  by: string
  verdict: FeedbackVerdict
  reason?: FeedbackReason
  note?: string
  createdAt: string
}

export interface Entry {
  id: string
  type: EntryTypeKey
  title: string
  summary: string
  /** Main body, markdown. */
  content: string
  details: Details
  /** Key into the type's own lifecycle stages. */
  stage?: string
  category: string
  /** Cross-cutting taxonomy, independent of category/type. Both optional and free-form. */
  portfolio?: string
  project?: string
  /** Related ticket or task, e.g. a Jira/DevOps id — free-form, same pattern as project. */
  task?: string
  /** Which per-team SharePoint task list `task` was picked from, and its item id there — set when picked via the lookup popup, blank for free-typed text. */
  taskListTitle?: string
  taskItemId?: number
  /** Other people this entry is relevant to, beyond author/reviewer — e.g. "loop them in". */
  taggedUsers?: string[]
  tech: string[]
  tags: string[]
  status: EntryStatus
  visibility: Visibility
  author: string
  /** Assigned reviewer for this entry's next submission (owner's call, editable). */
  reviewer?: string
  createdAt: string
  updatedAt: string
  attachments: Attachment[]
  evidence: Evidence[]
  relatedEntryIds: string[]
  comments: Comment[]
  versions: Version[]
  feedback: Feedback[]
  verification: Verification
  views: number
}

export interface Category {
  id: string
  name: string
  parentId?: string
}

export interface User {
  id: string
  name: string
  role: Role
  team?: string
  /** User principal name / email — needed to resolve this person in SharePoint's People field. */
  upn?: string
}

export const canEdit = (role: Role) => role === 'admin' || role === 'editor'
export const isInternal = (role: Role) => role !== 'client'
/** Anyone internal but the author can act as a reviewer — keeps the demo usable with 3 internal seats. */
export const canReview = (role: Role) => role === 'admin' || role === 'editor'

/**
 * The one security boundary in this app. Client accounts may only ever see
 * published + client-visible entries. Everything that lists entries goes
 * through here — never through the raw array.
 */
export function visibleTo(entries: Entry[], role: Role): Entry[] {
  if (role === 'client') return entries.filter((e) => e.visibility === 'client' && e.status === 'published')
  if (role === 'viewer') return entries.filter((e) => e.status !== 'archived')
  return entries
}
