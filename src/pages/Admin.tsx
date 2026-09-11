import { useState } from 'react'
import { Panel, btn, input } from '../components/ui'
import { useKb } from '../kb/store'
import { Category } from '../types'

export default function Admin() {
  const { categories, portfolios, users, entries, saveCategory, removeCategory, addPortfolio, removePortfolio, resetToSeed } = useKb()
  const [newCat, setNewCat] = useState('')
  const [newParent, setNewParent] = useState('')
  const [newPortfolio, setNewPortfolio] = useState('')

  const addCategory = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCat.trim()) return
    const cat: Category = { id: newCat.trim().toLowerCase().replace(/\s+/g, '-'), name: newCat.trim(), parentId: newParent || undefined }
    saveCategory(cat)
    setNewCat('')
    setNewParent('')
  }

  const addPortfolioSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPortfolio.trim()) return
    addPortfolio(newPortfolio.trim())
    setNewPortfolio('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Admin</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage the category taxonomy and see who has access.</p>
        </div>
        <button
          onClick={() => confirm('Reset all entries and categories back to the seed data? Your changes will be lost.') && resetToSeed()}
          className={btn.ghost}
        >
          Reset demo data
        </button>
      </div>

      <Panel title="Categories" hint="Entries are attached to a category id — deleting one just detaches its children, it never deletes entries">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2">{c.parentId ? `— ${c.name}` : c.name}</td>
                <td className="px-4 py-2 text-right text-xs text-slate-400">{entries.filter((e) => e.category === c.id).length} entries</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => removeCategory(c.id)} className="text-xs text-rose-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={addCategory} className="flex flex-wrap items-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
          <label className="flex-1 space-y-1 text-xs">
            <span className="font-semibold uppercase text-slate-500">New category</span>
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Security" className={input} />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-semibold uppercase text-slate-500">Parent (optional)</span>
            <select value={newParent} onChange={(e) => setNewParent(e.target.value)} className={input}>
              <option value="">None — top level</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button type="submit" className={btn.primary}>Add</button>
        </form>
      </Panel>

      <Panel title="Portfolios" hint="The business line / client account an entry belongs to — cross-cuts category and type">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {portfolios.map((p) => (
              <tr key={p}>
                <td className="px-4 py-2">{p}</td>
                <td className="px-4 py-2 text-right text-xs text-slate-400">{entries.filter((e) => e.portfolio === p).length} entries</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => removePortfolio(p)} className="text-xs text-rose-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form onSubmit={addPortfolioSubmit} className="flex flex-wrap items-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
          <label className="flex-1 space-y-1 text-xs">
            <span className="font-semibold uppercase text-slate-500">New portfolio</span>
            <input value={newPortfolio} onChange={(e) => setNewPortfolio(e.target.value)} placeholder="e.g. Managed Services" className={input} />
          </label>
          <button type="submit" className={btn.primary}>Add</button>
        </form>
      </Panel>

      <Panel title="Users & roles" hint="This prototype's data layer is local-only — real user management arrives with the backend">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Team</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 capitalize">{u.role}</td>
                <td className="px-4 py-2 text-slate-500">{u.team ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
