import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ReviewDialog } from '../components/ReviewActions'
import { Empty, Monogram, PageTitle, Panel, VerificationBadge, btn, fmtDate } from '../components/ui'
import { typeDef } from '../kb/schema'
import { useKb } from '../kb/store'

export default function ReviewQueue() {
  const { visible } = useKb()
  const [reviewing, setReviewing] = useState<string | null>(null)

  const queue = visible
    .filter((e) => e.verification.state === 'in_review')
    .sort((a, b) => (a.verification.submittedAt ?? '').localeCompare(b.verification.submittedAt ?? ''))

  const reviewingEntry = queue.find((e) => e.id === reviewing)

  return (
    <div className="space-y-6">
      <div>
        <PageTitle>Review queue</PageTitle>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Knowledge waiting for your review, oldest first.</p>
      </div>

      {queue.length === 0 ? (
        <Empty title="You're all caught up" hint="✓ Nothing needs your attention." />
      ) : (
        <Panel>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {queue.map((e) => {
              const def = typeDef(e.type)
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <Monogram type={e.type} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/entry/${e.id}`} className="truncate font-medium hover:underline">
                      {e.title}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{def.label}</span>
                      <span>·</span>
                      <span>by {e.author}</span>
                      <span>·</span>
                      <span>submitted {e.verification.submittedAt ? fmtDate(e.verification.submittedAt) : '—'}</span>
                      <span>·</span>
                      <span>{e.evidence.length} evidence item{e.evidence.length === 1 ? '' : 's'}</span>
                      {e.verification.reviewer && (
                        <>
                          <span>·</span>
                          <span>assigned to {e.verification.reviewer}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <VerificationBadge entry={e} size="sm" />
                  <button onClick={() => setReviewing(e.id)} className={btn.primary}>
                    Review
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      {reviewingEntry && (
        <ReviewDialog entryId={reviewingEntry.id} title={reviewingEntry.title} open={!!reviewing} onClose={() => setReviewing(null)} />
      )}
    </div>
  )
}
