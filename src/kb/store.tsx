import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { seedCategories, seedEntries, seedPortfolios, seedUsers } from '../data/seed'
import { Category, Comment, Entry, Role, User, Version, visibleTo } from '../types'

const KEY = 'hochhuth-kb.v2'

interface Persisted {
  entries: Entry[]
  categories: Category[]
  portfolios: string[]
  role: Role
}

function load(): Persisted {
  const fallback: Persisted = { entries: seedEntries, categories: seedCategories, portfolios: seedPortfolios, role: 'admin' }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Persisted>
    if (!Array.isArray(parsed.entries)) return fallback
    return {
      entries: parsed.entries,
      categories: Array.isArray(parsed.categories) ? parsed.categories : seedCategories,
      portfolios: Array.isArray(parsed.portfolios) ? parsed.portfolios : seedPortfolios,
      role: parsed.role ?? 'admin',
    }
  } catch {
    return fallback // corrupt or unavailable storage -> fall back to seed, don't blow up
  }
}

interface KbValue {
  entries: Entry[]
  /** Entries the current role is allowed to see. Use this for anything user-facing. */
  visible: Entry[]
  categories: Category[]
  portfolios: string[]
  users: User[]
  currentUser: User
  setRole: (role: Role) => void
  categoryName: (id: string) => string
  save: (entry: Entry, note?: string) => void
  remove: (id: string) => void
  addComment: (entryId: string, body: string) => void
  revert: (entryId: string, versionId: string) => void
  countView: (entryId: string) => void
  saveCategory: (category: Category) => void
  removeCategory: (id: string) => void
  addPortfolio: (name: string) => void
  removePortfolio: (name: string) => void
  resetToSeed: () => void
}

const Ctx = createContext<KbValue | undefined>(undefined)

export function KbProvider({ children }: { children: React.ReactNode }) {
  const [{ entries, categories, portfolios, role }, setState] = useState<Persisted>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ entries, categories, portfolios, role }))
    } catch {
      /* quota or private mode — the app still works, it just won't remember.
         ponytail: attachments are stored as data URLs, so a few large files can hit this. */
    }
  }, [entries, categories, portfolios, role])

  const patch = (p: Partial<Persisted>) => setState((s) => ({ ...s, ...p }))
  const mapEntries = (fn: (e: Entry) => Entry) => setState((s) => ({ ...s, entries: s.entries.map(fn) }))

  const currentUser = useMemo(() => seedUsers.find((u) => u.role === role) ?? seedUsers[0], [role])
  const visible = useMemo(() => visibleTo(entries, role), [entries, role])

  const snapshotOf = (e: Entry): Version['snapshot'] => ({
    title: e.title,
    summary: e.summary,
    content: e.content,
    details: e.details,
    stage: e.stage,
    tags: e.tags,
    tech: e.tech,
    status: e.status,
    visibility: e.visibility,
    portfolio: e.portfolio,
    project: e.project,
  })

  const value: KbValue = {
    entries,
    visible,
    categories,
    portfolios,
    users: seedUsers,
    currentUser,
    setRole: (r) => patch({ role: r }),

    categoryName: (id) => categories.find((c) => c.id === id)?.name ?? id,

    save: (entry, note) => {
      const now = new Date().toISOString()
      setState((s) => {
        const exists = s.entries.some((e) => e.id === entry.id)
        const version: Version = {
          id: `v${Date.now()}`,
          editedBy: currentUser.name,
          editedAt: now,
          summary: note || (exists ? 'Updated' : 'Created'),
          snapshot: snapshotOf(entry),
        }
        const next: Entry = { ...entry, updatedAt: now, versions: [...entry.versions, version] }
        return {
          ...s,
          entries: exists ? s.entries.map((e) => (e.id === entry.id ? next : e)) : [next, ...s.entries],
        }
      })
    },

    remove: (id) => setState((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) })),

    addComment: (entryId, body) => {
      const comment: Comment = {
        id: `c${Date.now()}`,
        author: currentUser.name,
        body,
        createdAt: new Date().toISOString(),
      }
      mapEntries((e) => (e.id === entryId ? { ...e, comments: [...e.comments, comment] } : e))
    },

    revert: (entryId, versionId) => {
      const now = new Date().toISOString()
      mapEntries((e) => {
        if (e.id !== entryId) return e
        const target = e.versions.find((v) => v.id === versionId)
        if (!target) return e
        return {
          ...e,
          ...target.snapshot,
          updatedAt: now,
          versions: [
            ...e.versions,
            {
              id: `v${Date.now()}`,
              editedBy: currentUser.name,
              editedAt: now,
              summary: `Reverted to ${new Date(target.editedAt).toLocaleString()}`,
              snapshot: target.snapshot,
            },
          ],
        }
      })
    },

    countView: (entryId) => mapEntries((e) => (e.id === entryId ? { ...e, views: e.views + 1 } : e)),

    saveCategory: (category) =>
      setState((s) => ({
        ...s,
        categories: s.categories.some((c) => c.id === category.id)
          ? s.categories.map((c) => (c.id === category.id ? category : c))
          : [...s.categories, category],
      })),

    removeCategory: (id) =>
      setState((s) => ({
        ...s,
        // keep it simple: only detach children, entries keep their (now orphaned) id
        categories: s.categories
          .filter((c) => c.id !== id)
          .map((c) => (c.parentId === id ? { ...c, parentId: undefined } : c)),
      })),

    addPortfolio: (name) =>
      setState((s) => (s.portfolios.includes(name) ? s : { ...s, portfolios: [...s.portfolios, name] })),

    removePortfolio: (name) =>
      setState((s) => ({ ...s, portfolios: s.portfolios.filter((p) => p !== name) })),
    // entries keep their portfolio string even if removed from the list — same "orphan, don't cascade" rule as categories

    resetToSeed: () => setState({ entries: seedEntries, categories: seedCategories, portfolios: seedPortfolios, role }),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useKb() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useKb must be used inside <KbProvider>')
  return ctx
}
