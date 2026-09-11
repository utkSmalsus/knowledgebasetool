import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Admin from './pages/Admin'
import Browse from './pages/Browse'
import Dashboard from './pages/Dashboard'
import EntryDetail from './pages/EntryDetail'
import EntryForm from './pages/EntryForm'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/type/:key" element={<Browse />} />
        <Route path="/entry/:id" element={<EntryDetail />} />
        <Route path="/new" element={<EntryForm />} />
        <Route path="/edit/:id" element={<EntryForm />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Layout>
  )
}
