import { Entry, User } from '../../types'
import { ensureSiteUser, findItemIdByTitleAndType } from './client'
import { MASTER_TASKS_LIST, PORTFOLIO_ITEM_TYPE, PROJECT_ITEM_TYPE } from './provision'

/**
 * Maps Entry <-> the knowledgebase list's fields (see provision.ts for the
 * column definitions). Simple scalar fields become real columns; anything
 * nested (arrays, objects) round-trips as a JSON string in a Note column.
 * Portfolio/Project are real Lookup columns into Master Tasks — resolved by
 * title-search here, never by creating anything there. TaggedUsers is a
 * native multi-value Person field, resolved via each local User's `upn`.
 */

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export async function entryToListItemFields(entry: Entry, users: User[]): Promise<Record<string, unknown>> {
  const [portfolioId, projectId] = await Promise.all([
    entry.portfolio ? findItemIdByTitleAndType(MASTER_TASKS_LIST, entry.portfolio, 'Item_x0020_Type', PORTFOLIO_ITEM_TYPE) : undefined,
    entry.project ? findItemIdByTitleAndType(MASTER_TASKS_LIST, entry.project, 'Item_x0020_Type', PROJECT_ITEM_TYPE) : undefined,
  ])

  const taggedUpns = (entry.taggedUsers ?? [])
    .map((name) => users.find((u) => u.name === name)?.upn)
    .filter((upn): upn is string => !!upn)
  const taggedUserIds = (await Promise.all(taggedUpns.map((upn) => ensureSiteUser(upn)))).filter((id): id is number => id !== undefined)

  return {
    Title: entry.title,
    EntryId: entry.id,
    EntryType: entry.type,
    Summary: entry.summary,
    Content: entry.content,
    Category: entry.category,
    Stage: entry.stage ?? '',
    PortfolioId: portfolioId,
    ProjectId: projectId,
    Task: entry.task ?? '',
    // TaskListTitle / TaskItemId are set once the cross-list task picker (see SHAREPOINT.md) links an existing task — left blank otherwise.
    EntryStatus: entry.status,
    Visibility: entry.visibility,
    // Internal name is 'Author0' — SharePoint's built-in Created-By field already owns 'Author'.
    Author0: entry.author,
    Reviewer: entry.reviewer ?? '',
    CreatedAtIso: entry.createdAt,
    UpdatedAtIso: entry.updatedAt,
    Views: entry.views,
    // Verbose OData needs the collection's type spelled out here, unlike a plain {results:[...]}.
    TaggedUsersId: { __metadata: { type: 'Collection(Edm.Int32)' }, results: taggedUserIds },
    TagsJson: JSON.stringify(entry.tags),
    TechJson: JSON.stringify(entry.tech),
    DetailsJson: JSON.stringify(entry.details),
    AttachmentsJson: JSON.stringify(entry.attachments),
    EvidenceJson: JSON.stringify(entry.evidence),
    RelatedEntryIdsJson: JSON.stringify(entry.relatedEntryIds),
    CommentsJson: JSON.stringify(entry.comments),
    VersionsJson: JSON.stringify(entry.versions),
    FeedbackJson: JSON.stringify(entry.feedback),
    VerificationJson: JSON.stringify(entry.verification),
  }
}

export function listItemToEntry(item: Record<string, any>): Entry {
  return {
    id: item.EntryId || String(item.Id),
    type: item.EntryType,
    title: item.Title ?? '',
    summary: item.Summary ?? '',
    content: item.Content ?? '',
    details: parseJsonField(item.DetailsJson, {}),
    stage: item.Stage || undefined,
    category: item.Category ?? '',
    portfolio: item.Portfolio?.Title || undefined,
    project: item.Project?.Title || undefined,
    task: item.Task || undefined,
    taggedUsers: (item.TaggedUsers?.results ?? []).map((u: any) => u.Title).filter(Boolean),
    tech: parseJsonField(item.TechJson, []),
    tags: parseJsonField(item.TagsJson, []),
    status: item.EntryStatus ?? 'draft',
    visibility: item.Visibility ?? 'internal',
    author: item.Author0 ?? '',
    reviewer: item.Reviewer || undefined,
    createdAt: item.CreatedAtIso ?? new Date().toISOString(),
    updatedAt: item.UpdatedAtIso ?? new Date().toISOString(),
    attachments: parseJsonField(item.AttachmentsJson, []),
    evidence: parseJsonField(item.EvidenceJson, []),
    relatedEntryIds: parseJsonField(item.RelatedEntryIdsJson, []),
    comments: parseJsonField(item.CommentsJson, []),
    versions: parseJsonField(item.VersionsJson, []),
    feedback: parseJsonField(item.FeedbackJson, []),
    verification: parseJsonField(item.VerificationJson, { state: 'unverified', history: [] }),
    views: Number(item.Views ?? 0),
  }
}
