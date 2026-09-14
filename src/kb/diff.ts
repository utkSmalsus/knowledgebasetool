import { Version } from '../types'

export interface FieldDiff {
  label: string
  before: string
  after: string
}

const flatten = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(', ') : (v ?? ''))

/**
 * Field-level diff between two version snapshots — no line/word-level diffing
 * (that's a whole library for a "what changed" summary that doesn't need it).
 * Only fields that actually differ are returned.
 */
export function diffSnapshots(before: Version['snapshot'], after: Version['snapshot']): FieldDiff[] {
  const out: FieldDiff[] = []
  const push = (label: string, b: string, a: string) => {
    if (b !== a) out.push({ label, before: b, after: a })
  }

  push('Title', before.title, after.title)
  push('Summary', before.summary, after.summary)
  push('Content', before.content, after.content)
  push('Stage', before.stage ?? '—', after.stage ?? '—')
  push('Status', before.status, after.status)
  push('Visibility', before.visibility, after.visibility)
  push('Portfolio', before.portfolio ?? '—', after.portfolio ?? '—')
  push('Project', before.project ?? '—', after.project ?? '—')
  push('Task', before.task ?? '—', after.task ?? '—')
  push('Tagged', (before.taggedUsers ?? []).join(', ') || '—', (after.taggedUsers ?? []).join(', ') || '—')
  push('Tags', before.tags.join(', '), after.tags.join(', '))
  push('Technology', before.tech.join(', '), after.tech.join(', '))

  const keys = new Set([...Object.keys(before.details), ...Object.keys(after.details)])
  for (const key of keys) {
    push(key, flatten(before.details[key]), flatten(after.details[key]))
  }

  return out
}
