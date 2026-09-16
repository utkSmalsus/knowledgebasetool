import { Attachment } from '../../types'
import { EntryTypeKey, typeDef } from '../schema'
import { ensureFolder, uploadFile } from './client'
import { sharepointConfig } from './config'

/**
 * Attachments land in the site's own "Documents" library, same as every other tool on this
 * tenant (Meeting, CustomTeamApp, …) — one folder per tool ("knowledgebasedocuments"), then one
 * subfolder per entry type underneath, named after that type's own label.
 */
const DOCUMENT_LIBRARY = 'Documents'
const ROOT_FOLDER = 'knowledgebasedocuments'

const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)

async function typeFolder(type: EntryTypeKey): Promise<string> {
  const siteRelativePath = new URL(sharepointConfig.siteUrl).pathname.replace(/\/+$/, '')
  const libraryRoot = `${siteRelativePath}/${DOCUMENT_LIBRARY}`
  const kbRoot = await ensureFolder(libraryRoot, ROOT_FOLDER)
  return ensureFolder(kbRoot, typeDef(type).label)
}

/** Uploads a file into this entry type's SharePoint folder (creating it on first use) and returns it as an Attachment. */
export async function uploadEntryAttachment(type: EntryTypeKey, file: File): Promise<Attachment> {
  const folder = await typeFolder(type)
  const uploaded = await uploadFile(folder, file)
  return {
    id: `att${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    name: uploaded.name,
    url: uploaded.url,
    note: sizeLabel(file.size),
  }
}
