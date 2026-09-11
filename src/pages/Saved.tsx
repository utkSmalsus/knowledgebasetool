import { Link } from 'react-router-dom'
import EntryCard from '../components/EntryCard'
import { Empty, PageTitle, SectionTitle, btn } from '../components/ui'
import { useKb } from '../kb/store'
import { isInternal } from '../types'

export default function Saved() {
  const { savedEntries, recentlyViewedEntries, currentUser } = useKb()
  const internal = isInternal(currentUser.role)

  return (
    <div className="space-y-8">
      <PageTitle>Saved &amp; recent</PageTitle>

      <section className="space-y-3">
        <SectionTitle>Saved knowledge</SectionTitle>
        {savedEntries.length === 0 ? (
          <Empty title="Nothing saved yet" hint="Save an entry from its page to find it again quickly." />
        ) : (
          <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {savedEntries.map((e) => (
              <EntryCard key={e.id} entry={e} showVisibility={internal} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>Recently viewed</SectionTitle>
        {recentlyViewedEntries.length === 0 ? (
          <Empty title="Nothing viewed yet" hint="Entries you open will show up here." action={<Link to="/browse" className={btn.ghost}>Browse knowledge</Link>} />
        ) : (
          <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyViewedEntries.map((e) => (
              <EntryCard key={e.id} entry={e} showVisibility={internal} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
