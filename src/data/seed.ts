import { Category, Entry, User } from '../types'

export const seedCategories: Category[] = [
  { id: 'eng', name: 'Engineering' },
  { id: 'eng-sharepoint', name: 'SharePoint & M365', parentId: 'eng' },
  { id: 'eng-frontend', name: 'Frontend', parentId: 'eng' },
  { id: 'eng-backend', name: 'Backend & Data', parentId: 'eng' },
  { id: 'eng-cloud', name: 'Azure & Cloud', parentId: 'eng' },
  { id: 'eng-data', name: 'Data & AI', parentId: 'eng' },
  { id: 'delivery', name: 'Delivery & Process' },
  { id: 'clients', name: 'Client Projects' },
  { id: 'ops', name: 'Internal Operations' },
]

export const seedPortfolios: string[] = [
  'Client Delivery',
  'Internal Platform',
  'R&D & Innovation',
  'Managed Services',
]

export const seedUsers: User[] = [{ id: 'u1', name: 'Utkarsh (You)', role: 'admin', team: 'Engineering' }]

/** No demo content ships with the app — real entries only, created via SharePoint or the UI. */
export const seedEntries: Entry[] = []
