import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import EntryCard from '../components/EntryCard'
import {
  Empty,
  Monogram,
  PageTitle,
  Panel,
  SectionTitle,
  StatusChip,
  VerificationBadge,
  btn,
  input,
  tone,
} from '../components/ui'
import { needsAttention } from '../kb/attention'
import { recommend } from '../kb/recommend'
import { firstNameOf } from '../kb/recommend'
import { typeDef } from '../kb/schema'
import { useKb } from '../kb/store'
import { Entry, canEdit, isExpired, isInternal } from '../types'
import { useState } from 'react'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { visible, currentUser, recentlyViewedEntries } = useKb()
  const navigate = useNavigate()
  const [heroQuery, setHeroQuery] = useState('')
  const internal = isInternal(currentUser.role)
  const isContributor = canEdit(currentUser.role)

  const recent = [...visible].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6)
  const popular = [...visible].sort((a, b) => b.views - a.views).slice(0, 5)
  const attention = internal ? needsAttention(visible) : []

  // ---- personal digest (real, derived from the current user's own authored entries) ----
  const mine = visible.filter((e) => e.author === currentUser.name)
  const myDrafts = mine.filter((e) => e.status === 'draft' && e.verification.state !== 'in_review')
  const myAwaitingReview = mine.filter((e) => e.verification.state === 'in_review')
  const myNeedsUpdate = mine.filter((e) => e.verification.state === 'needs_update' || isExpired(e.verification))

  const seedForRecs = mine.length ? mine : recentlyViewedEntries
  const recommended = recommend(
    visible,
    seedForRecs,
    new Set([...mine.map((e) => e.id), ...recentlyViewedEntries.map((e) => e.id)]),
    4,
  )

  const stats = internal
    ? [
        { label: 'Entries', value: visible.length, to: '/browse' },
        { label: 'Published', value: visible.filter((e) => e.status === 'published').length, to: '/browse?status=published' },
        { label: 'Verified', value: visible.filter((e) => e.verification.state === 'verified').length, to: '/browse?verified=1' },
        {
          label: 'Client-visible',
          value: visible.filter((e) => e.visibility === 'client').length,
          to: '/browse?visibility=client',
        },
      ]
    : [{ label: 'Entries available to you', value: visible.length, to: '/browse' }]

  return (
    <div className="space-y-10">
      {/* ---------- hero ---------- */}
      <section className="animate-fade-up rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-6 py-10 text-center shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:px-10 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Everything your team knows, in one place.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
          Discover research, decisions, solutions and expertise from across the organization.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            navigate(`/browse?q=${encodeURIComponent(heroQuery)}`)
          }}
          className="mx-auto mt-6 flex max-w-xl items-center gap-2"
        >
          <input
            value={heroQuery}
            onChange={(e) => setHeroQuery(e.target.value)}
            placeholder="Search knowledge, ask a question, or find an expert…"
            className={`${input} py-3 text-sm shadow-sm`}
          />
          <button type="submit" className={`${btn.primary} px-5 py-3`}>
            Search
          </button>
        </form>
      </section>

      {/* ---------- personal digest ---------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <PageTitle>{internal ? `${greeting()}, ${firstNameOf(currentUser.name)}` : 'Welcome'}</PageTitle>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isContributor
                ? "Here's what needs your attention."
                : internal
                  ? 'Browse verified knowledge across the organization, or catch up on what changed.'
                  : 'You see only entries your engagement lead has shared with your account.'}
            </p>
          </div>
          {isContributor && (
            <Link to="/new" className={btn.primary}>
              Share knowledge
            </Link>
          )}
        </div>

        <div className={`grid gap-3 ${internal ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {stats.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{s.value}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
            </Link>
          ))}
        </div>

        {isContributor && (myDrafts.length > 0 || myAwaitingReview.length > 0 || myNeedsUpdate.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-3">
            <DigestTile label="Drafts" value={myDrafts.length} to={`/browse?status=draft&author=${encodeURIComponent(currentUser.name)}`} tone="gray" />
            <DigestTile
              label="Awaiting review"
              value={myAwaitingReview.length}
              to={`/browse?author=${encodeURIComponent(currentUser.name)}`}
              tone="blue"
            />
            <DigestTile label="Needs update" value={myNeedsUpdate.length} to={`/browse?author=${encodeURIComponent(currentUser.name)}`} tone="amber" />
          </div>
        )}
      </section>

      {/* ---------- continue where you left off ---------- */}
      {recentlyViewedEntries.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>Continue where you left off</SectionTitle>
          <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyViewedEntries.slice(0, 3).map((e) => (
              <EntryCard key={e.id} entry={e} showVisibility={internal} compact />
            ))}
          </div>
        </section>
      )}

      {/* ---------- recommended ---------- */}
      {recommended.length > 0 && (
        <section className="space-y-3">
          <div>
            <SectionTitle>Recommended for you</SectionTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Based on {mine.length ? 'the technologies and tags in your own knowledge' : 'what you have recently viewed'}
            </p>
          </div>
          <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((e) => (
              <RecommendCard key={e.id} entry={e} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- org-wide ---------- */}
      {attention.length > 0 && (
        <Panel title="Needs attention" hint="Knowledge goes stale quietly — these are the entries asking for a human">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {attention.slice(0, 6).map(({ entry, reason }) => (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                <Monogram type={entry.type} size="sm" />
                <Link to={`/entry/${entry.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                  {entry.title}
                </Link>
                <StatusChip status={entry.status} />
                <span className="hidden shrink-0 text-xs text-amber-700 dark:text-amber-300 sm:block">{reason}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Recently updated">
          <div className="stagger space-y-3 p-3">
            {recent.length === 0 && <Empty title="No knowledge yet" hint="Be the first person to share something your team learned." action={isContributor ? <Link to="/new" className={btn.primary}>Share knowledge</Link> : undefined} />}
            {recent.map((e) => (
              <EntryCard key={e.id} entry={e} showVisibility={internal} />
            ))}
          </div>
        </Panel>

        <Panel title="Most read">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {popular.map((e) => (
              <li key={e.id} className="flex items-center gap-2 px-4 py-2">
                <Monogram type={e.type} size="sm" />
                <Link to={`/entry/${e.id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                  {e.title}
                </Link>
                <VerificationBadge entry={e} size="sm" />
                <span className="shrink-0 text-xs tabular-nums text-slate-400">{e.views}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function DigestTile({ label, value, to, tone: t }: { label: string; value: number; to: string; tone: 'gray' | 'blue' | 'amber' }) {
  const styles = {
    gray: 'border-slate-200 dark:border-slate-800',
    blue: 'border-sky-200 dark:border-sky-900',
    amber: 'border-amber-200 dark:border-amber-900',
  }
  return (
    <Link
      to={to}
      className={`flex items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:bg-slate-900 ${styles[t]}`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-lg font-bold tabular-nums">{value}</span>
    </Link>
  )
}

function RecommendCard({ entry }: { entry: Entry }) {
  const def = typeDef(entry.type)
  return (
    <Link
      to={`/entry/${entry.id}`}
      className={`block rounded-xl border border-l-4 border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${tone[def.tone].border}`}
    >
      <div className="flex items-center gap-2">
        <Monogram type={entry.type} size="sm" />
        <span className={`text-[11px] font-medium ${tone[def.tone].text}`}>{def.label}</span>
      </div>
      <div className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug">{entry.title}</div>
      <div className="mt-2">
        <VerificationBadge entry={entry} size="sm" />
      </div>
    </Link>
  )
}
