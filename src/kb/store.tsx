import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { seedCategories, seedEntries, seedPortfolios, seedUsers } from '../data/seed'
import { migrateEntryType } from '../kb/migrate'
import {
  Category,
  Comment,
  Entry,
  Feedback,
  ReviewAction,
  Role,
  User,
  Verification,
  VerificationChecks,
  Version,
  Visibility,
  visibleTo,
} from '../types'

// v4: the knowledge taxonomy was simplified from 7 overlapping types down to
// 6 (see src/kb/schema.ts and src/kb/migrate.ts). Anyone with v3 data still in
// their browser gets migrated in place below — nothing is deleted.
const KEY = 'hochhuth-kb.v4'
const LEGACY_KEYS = ['hochhuth-kb.v3']

interface Persisted {
  entries: Entry[]
  categories: Category[]
  portfolios: string[]
  role: Role
  /** Per-user id -> saved/recently-viewed entry ids. Keyed by User.id. */
  saved: Record<string, string[]>
  recentlyViewed: Record<string, string[]>
}

const emptyPersisted = (): Persisted => ({
  entries: seedEntries,
  categories: seedCategories,
  portfolios: seedPortfolios,
  role: 'admin',
  saved: {},
  recentlyViewed: {},
})

function load(): Persisted {
  const fallback = emptyPersisted()
  try {
    let raw = localStorage.getItem(KEY)
    if (!raw) {
      // nothing at the current key — check for pre-taxonomy-change data before giving up
      for (const legacyKey of LEGACY_KEYS) {
        const legacy = localStorage.getItem(legacyKey)
        if (legacy) {
          raw = legacy
          break
        }
      }
    }
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Persisted>
    if (!Array.isArray(parsed.entries)) return fallback
    return {
      entries: parsed.entries.map(migrateEntryType),
      categories: Array.isArray(parsed.categories) ? parsed.categories : seedCategories,
      portfolios: Array.isArray(parsed.portfolios) ? parsed.portfolios : seedPortfolios,
      role: parsed.role ?? 'admin',
      saved: parsed.saved ?? {},
      recentlyViewed: parsed.recentlyViewed ?? {},
    }
  } catch {
    return fallback // corrupt or unavailable storage -> fall back to seed, don't blow up
  }
}

const RECENT_CAP = 8

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
  /** Upserts entries by id — used to merge in entries pulled from an external source (e.g. SharePoint). */
  importEntries: (entries: Entry[]) => void

  // trust layer
  submitForReview: (entryId: string, reviewer?: string) => void
  approve: (entryId: string, opts: { checks: VerificationChecks; note?: string; reviewIntervalDays?: number; visibility?: Visibility }) => void
  requestChanges: (entryId: string, note: string) => void
  reject: (entryId: string, note: string) => void
  markNeedsUpdate: (entryId: string, note: string) => void
  deprecate: (entryId: string, note: string) => void
  addFeedback: (entryId: string, feedback: Omit<Feedback, 'id' | 'createdAt'>) => void

  // per-user
  isSaved: (entryId: string) => boolean
  toggleSaved: (entryId: string) => void
  savedEntries: Entry[]
  recentlyViewedEntries: Entry[]
  markViewed: (entryId: string) => void
}

const Ctx = createContext<KbValue | undefined>(undefined)

export function KbProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(load)
  const { entries, categories, portfolios, saved, recentlyViewed } = state

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* quota or private mode — the app still works, it just won't remember.
         ponytail: attachments are stored as data URLs, so a few large files can hit this. */
    }
  }, [state])

  const patch = (p: Partial<Persisted>) => setState((s) => ({ ...s, ...p }))
  const mapEntries = (fn: (e: Entry) => Entry) => setState((s) => ({ ...s, entries: s.entries.map(fn) }))

  // ponytail: no real roles yet — everyone is admin until the SharePoint super-admin
  // group check lands (then this resolves from group membership instead of `role`).
  const currentUser = useMemo(() => seedUsers.find((u) => u.role === 'admin') ?? seedUsers[0], [])
  const visible = useMemo(() => visibleTo(entries, 'admin'), [entries])

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
    task: e.task,
    taggedUsers: e.taggedUsers,
  })

  const logEvent = (v: Verification, action: ReviewAction, by: string, note?: string): Verification => ({
    ...v,
    history: [...v.history, { id: `rv${Date.now()}${Math.random().toString(36).slice(2, 5)}`, action, by, at: new Date().toISOString(), note }],
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

    resetToSeed: () => setState(emptyPersisted()),

    importEntries: (incoming) =>
      setState((s) => {
        const byId = new Map(s.entries.map((e) => [e.id, e]))
        for (const e of incoming) byId.set(e.id, e)
        return { ...s, entries: Array.from(byId.values()) }
      }),

    // -------------------- trust layer --------------------

    submitForReview: (entryId, reviewer) =>
      mapEntries((e) => {
        if (e.id !== entryId) return e
        const now = new Date().toISOString()
        return {
          ...e,
          reviewer: reviewer ?? e.reviewer,
          verification: logEvent(
            { ...e.verification, state: 'in_review', submittedAt: now, reviewer: reviewer ?? e.reviewer },
            'submitted',
            currentUser.name,
          ),
        }
      }),

    approve: (entryId, opts) =>
      mapEntries((e) => {
        if (e.id !== entryId) return e
        const now = new Date().toISOString()
        const days = opts.reviewIntervalDays
        const nextReviewAt = days ? new Date(Date.now() + days * 86400000).toISOString() : undefined
        const partial = !(opts.checks.contentReviewed && opts.checks.evidenceChecked && opts.checks.approachValidated)
        const v: Verification = {
          ...e.verification,
          state: partial ? 'partially_verified' : 'verified',
          verifiedBy: currentUser.name,
          verifiedAt: now,
          reviewer: undefined,
          reviewIntervalDays: days,
          nextReviewAt,
          checks: opts.checks,
        }
        return {
          ...e,
          visibility: opts.visibility ?? e.visibility,
          verification: logEvent(v, partial ? 'partially_approved' : 'approved', currentUser.name, opts.note),
        }
      }),

    requestChanges: (entryId, note) =>
      mapEntries((e) =>
        e.id === entryId
          ? {
              ...e,
              status: 'draft',
              verification: logEvent({ ...e.verification, state: 'unverified', reviewer: undefined }, 'changes_requested', currentUser.name, note),
            }
          : e,
      ),

    reject: (entryId, note) =>
      mapEntries((e) =>
        e.id === entryId
          ? {
              ...e,
              verification: logEvent({ ...e.verification, state: 'unverified', reviewer: undefined }, 'rejected', currentUser.name, note),
            }
          : e,
      ),

    markNeedsUpdate: (entryId, note) =>
      mapEntries((e) =>
        e.id === entryId ? { ...e, verification: logEvent({ ...e.verification, state: 'needs_update' }, 'marked_needs_update', currentUser.name, note) } : e,
      ),

    deprecate: (entryId, note) =>
      mapEntries((e) =>
        e.id === entryId ? { ...e, verification: logEvent({ ...e.verification, state: 'deprecated' }, 'deprecated', currentUser.name, note) } : e,
      ),

    addFeedback: (entryId, feedback) => {
      const item: Feedback = { ...feedback, id: `fb${Date.now()}`, createdAt: new Date().toISOString() }
      mapEntries((e) => (e.id === entryId ? { ...e, feedback: [...e.feedback, item] } : e))
    },

    // -------------------- per-user --------------------

    isSaved: (entryId) => (saved[currentUser.id] ?? []).includes(entryId),

    toggleSaved: (entryId) =>
      setState((s) => {
        const mine = s.saved[currentUser.id] ?? []
        const next = mine.includes(entryId) ? mine.filter((id) => id !== entryId) : [entryId, ...mine]
        return { ...s, saved: { ...s.saved, [currentUser.id]: next } }
      }),

    savedEntries: (saved[currentUser.id] ?? []).map((id) => entries.find((e) => e.id === id)).filter((e): e is Entry => !!e),

    recentlyViewedEntries: (recentlyViewed[currentUser.id] ?? [])
      .map((id) => entries.find((e) => e.id === id))
      .filter((e): e is Entry => !!e),

    markViewed: (entryId) =>
      setState((s) => {
        const mine = s.recentlyViewed[currentUser.id] ?? []
        const next = [entryId, ...mine.filter((id) => id !== entryId)].slice(0, RECENT_CAP)
        return { ...s, recentlyViewed: { ...s.recentlyViewed, [currentUser.id]: next } }
      }),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useKb() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useKb must be used inside <KbProvider>')
  return ctx
}
