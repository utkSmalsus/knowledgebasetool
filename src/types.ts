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
  /** Enough of the entry to restore it. */
  snapshot: Pick<
    Entry,
    'title' | 'summary' | 'content' | 'details' | 'stage' | 'tags' | 'tech' | 'status' | 'visibility' | 'portfolio' | 'project'
  >
}

export interface Attachment {
  id: string
  name: string
  url: string
  note?: string
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
  tech: string[]
  tags: string[]
  status: EntryStatus
  visibility: Visibility
  author: string
  createdAt: string
  updatedAt: string
  attachments: Attachment[]
  relatedEntryIds: string[]
  comments: Comment[]
  versions: Version[]
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
}

export const canEdit = (role: Role) => role === 'admin' || role === 'editor'
export const isInternal = (role: Role) => role !== 'client'

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
