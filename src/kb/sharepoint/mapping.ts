import { Entry } from '../../types'

/**
 * Maps Entry <-> a SharePoint list's fields. Simple scalar fields become
 * real columns; anything nested (arrays, objects) is round-tripped as a
 * JSON string in a "Multiple lines of text (plain text)" column — splitting
 * those into proper relational columns/lists is real future work, not
 * something to fake here. Column names below are what SHAREPOINT.md tells
 * you to create in the target list.
 */

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function entryToListItemFields(entry: Entry): Record<string, unknown> {
  return {
    Title: entry.title,
    EntryId: entry.id,
    EntryType: entry.type,
    Summary: entry.summary,
    Content: entry.content,
    Category: entry.category,
    Stage: entry.stage ?? '',
    Portfolio: entry.portfolio ?? '',
    Project: entry.project ?? '',
    Task: entry.task ?? '',
    EntryStatus: entry.status,
    Visibility: entry.visibility,
    Author: entry.author,
    Reviewer: entry.reviewer ?? '',
    CreatedAtIso: entry.createdAt,
    UpdatedAtIso: entry.updatedAt,
    Views: entry.views,
    TagsJson: JSON.stringify(entry.tags),
    TechJson: JSON.stringify(entry.tech),
    TaggedUsersJson: JSON.stringify(entry.taggedUsers ?? []),
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
    portfolio: item.Portfolio || undefined,
    project: item.Project || undefined,
    task: item.Task || undefined,
    taggedUsers: parseJsonField(item.TaggedUsersJson, []),
    tech: parseJsonField(item.TechJson, []),
    tags: parseJsonField(item.TagsJson, []),
    status: item.EntryStatus ?? 'draft',
    visibility: item.Visibility ?? 'internal',
    author: item.Author ?? '',
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
