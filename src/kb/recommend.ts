import { Entry } from '../types'

/**
 * Ranks candidates by tag/tech overlap with a set of "seed" entries (authored
 * work, recently viewed, or a single article for "related knowledge"). This
 * is real overlap on data already in the model — not a fabricated ML score.
 */
export function recommend(candidates: Entry[], seedEntries: Entry[], exclude: Set<string>, limit = 4): Entry[] {
  const weight = new Map<string, number>()
  for (const e of seedEntries) {
    for (const t of e.tags) weight.set(`tag:${t}`, (weight.get(`tag:${t}`) ?? 0) + 1)
    for (const t of e.tech) weight.set(`tech:${t}`, (weight.get(`tech:${t}`) ?? 0) + 1)
  }
  if (weight.size === 0) return []

  return candidates
    .filter((e) => !exclude.has(e.id))
    .map((e) => {
      let score = 0
      for (const t of e.tags) score += weight.get(`tag:${t}`) ?? 0
      for (const t of e.tech) score += weight.get(`tech:${t}`) ?? 0
      return { e, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.e.updatedAt.localeCompare(a.e.updatedAt))
    .slice(0, limit)
    .map((x) => x.e)
}

/** What two entries actually have in common — used for "relevant because" chips. */
export function overlapReasons(a: Entry, b: Entry): string[] {
  const tags = a.tags.filter((t) => b.tags.includes(t))
  const tech = a.tech.filter((t) => b.tech.includes(t))
  return [...tags, ...tech]
}

export const firstNameOf = (fullName: string) => fullName.split(/[\s(]/)[0]
