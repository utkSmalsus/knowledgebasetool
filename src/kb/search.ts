import { Category, Entry } from '../types'
import { EntryTypeKey, techLabel, typeDef } from './schema'

export interface Filters {
  q: string
  types: EntryTypeKey[]
  tech: string[]
  category: string
  portfolio: string
  project: string
  status: string
  visibility: string
  stage: string
  tag: string
  author: string
  sort: 'relevance' | 'updated' | 'created' | 'title' | 'views'
}

export const emptyFilters: Filters = {
  q: '',
  types: [],
  tech: [],
  category: '',
  portfolio: '',
  project: '',
  status: '',
  visibility: '',
  stage: '',
  tag: '',
  author: '',
  sort: 'relevance',
}

const flatten = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(' ') : (v ?? ''))

/** Every field a keyword search should reach, with a weight. */
function fields(entry: Entry): [string, number][] {
  return [
    [entry.title, 10],
    [entry.summary, 5],
    [entry.tags.join(' '), 4],
    [entry.tech.map(techLabel).join(' ') + ' ' + entry.tech.join(' '), 4],
    [(entry.portfolio ?? '') + ' ' + (entry.project ?? ''), 3],
    [typeDef(entry.type).label, 3],
    [entry.author, 2],
    [Object.values(entry.details).map(flatten).join(' '), 2],
    [entry.content, 1],
  ]
}

/** 0 = no match. Higher = better. Every token must appear somewhere. */
export function score(entry: Entry, query: string): number {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 1

  const parts = fields(entry).map(([text, weight]) => [text.toLowerCase(), weight] as const)
  let total = 0

  for (const token of tokens) {
    let best = 0
    for (const [text, weight] of parts) {
      const at = text.indexOf(token)
      if (at === -1) continue
      // whole-word and prefix hits beat a match buried mid-word
      const wordStart = at === 0 || !/[a-z0-9]/.test(text[at - 1])
      best = Math.max(best, weight * (wordStart ? 2 : 1))
    }
    if (best === 0) return 0 // AND semantics
    total += best
  }
  return total
}

/** Category ids of `id` plus everything nested under it. */
export function categoryBranch(categories: Category[], id: string): Set<string> {
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const c of categories) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
        out.add(c.id)
        grew = true
      }
    }
  }
  return out
}

export function applyFilters(entries: Entry[], f: Filters, categories: Category[]): Entry[] {
  const branch = f.category ? categoryBranch(categories, f.category) : null

  const hits = entries
    .map((entry) => ({ entry, s: score(entry, f.q) }))
    .filter(({ entry, s }) => {
      if (s === 0) return false
      if (f.types.length && !f.types.includes(entry.type)) return false
      if (f.tech.length && !f.tech.some((t) => entry.tech.includes(t))) return false
      if (branch && !branch.has(entry.category)) return false
      if (f.portfolio && entry.portfolio !== f.portfolio) return false
      if (f.project && entry.project !== f.project) return false
      if (f.status && entry.status !== f.status) return false
      if (f.visibility && entry.visibility !== f.visibility) return false
      if (f.stage && entry.stage !== f.stage) return false
      if (f.tag && !entry.tags.includes(f.tag)) return false
      if (f.author && entry.author !== f.author) return false
      return true
    })

  const by: Record<Filters['sort'], (a: typeof hits[0], b: typeof hits[0]) => number> = {
    relevance: (a, b) => b.s - a.s || b.entry.updatedAt.localeCompare(a.entry.updatedAt),
    updated: (a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt),
    created: (a, b) => b.entry.createdAt.localeCompare(a.entry.createdAt),
    title: (a, b) => a.entry.title.localeCompare(b.entry.title),
    views: (a, b) => b.entry.views - a.entry.views,
  }

  return hits.sort(by[f.sort] ?? by.relevance).map((h) => h.entry)
}

export const activeFilterCount = (f: Filters) =>
  f.types.length +
  f.tech.length +
  [f.category, f.portfolio, f.project, f.status, f.visibility, f.stage, f.tag, f.author].filter(Boolean).length
