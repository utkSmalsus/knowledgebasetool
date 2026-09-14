import { Route, Routes } from 'react-router-dom'
import { Empty } from './components/ui'
import Layout from './components/Layout'
import { useKb } from './kb/store'
import Admin from './pages/Admin'
import Browse from './pages/Browse'
import Dashboard from './pages/Dashboard'
import EntryDetail from './pages/EntryDetail'
import EntryForm from './pages/EntryForm'
import Experts from './pages/Experts'
import ReviewQueue from './pages/ReviewQueue'
// Saved & recent is disabled — see Layout.tsx, CommandPalette.tsx, EntryDetail.tsx, Dashboard.tsx, Saved.tsx
// import Saved from './pages/Saved'
import { Role, canEdit, canReview } from './types'

/**
 * Route-level gate. The sidebar already hides these links per role, but a
 * direct URL must not leak internal-only pages either — this is the actual
 * enforcement, the nav is just convenience.
 */
function RequireRole({ allow, children }: { allow: (role: Role) => boolean; children: React.ReactNode }) {
  const { currentUser } = useKb()
  if (!allow(currentUser.role)) {
    return <Empty title="Not available" hint="This page isn't available for your current role." />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/type/:key" element={<Browse />} />
        <Route path="/entry/:id" element={<EntryDetail />} />
        <Route
          path="/new"
          element={
            <RequireRole allow={canEdit}>
              <EntryForm />
            </RequireRole>
          }
        />
        <Route
          path="/edit/:id"
          element={
            <RequireRole allow={canEdit}>
              <EntryForm />
            </RequireRole>
          }
        />
        <Route
          path="/review"
          element={
            <RequireRole allow={canReview}>
              <ReviewQueue />
            </RequireRole>
          }
        />
        {/* <Route path="/saved" element={<Saved />} /> */}
        <Route path="/experts" element={<Experts />} />
        <Route
          path="/admin"
          element={
            <RequireRole allow={(role) => role === 'admin'}>
              <Admin />
            </RequireRole>
          }
        />
      </Routes>
    </Layout>
  )
}
