import { FieldDef, ensureFields, ensureList, getListGuid } from './client'
import { sharepointConfig } from './config'

/** The existing list our Portfolio/Project columns look up into — never created or modified here. */
export const MASTER_TASKS_LIST = 'Master Tasks'
/** Item_x0020_Type values on Master Tasks that represent a Portfolio-level / Project-level row. */
export const PORTFOLIO_ITEM_TYPE = 'Component'
export const PROJECT_ITEM_TYPE = 'Project'

/**
 * The knowledgebase list's full column set. Simple scalar fields are plain
 * columns; anything nested (tags, versions, comments, verification
 * history…) round-trips as a JSON string in a Note column — see mapping.ts.
 * Portfolio/Project are real Lookup columns into Master Tasks (filtered to
 * Component/Project rows by our own picker, not by the column itself —
 * SharePoint Lookup columns can't filter by a second field on their own).
 * Task isn't a Lookup: it references items across several separate
 * per-team Tasks lists (same pattern the Meeting tool uses), which a single
 * Lookup column can't span — TaskListTitle + TaskItemId record which list
 * and which item, resolved by our own cross-list search instead.
 */
function fieldDefs(masterTasksGuid: string): FieldDef[] {
  return [
    { internalName: 'EntryId', kind: 'Text' },
    { internalName: 'EntryType', kind: 'Text' },
    { internalName: 'Summary', kind: 'Note' },
    { internalName: 'Content', kind: 'Note' },
    { internalName: 'Category', kind: 'Text' },
    { internalName: 'Stage', kind: 'Text' },
    { internalName: 'EntryStatus', kind: 'Text' },
    { internalName: 'Visibility', kind: 'Text' },
    { internalName: 'Author', kind: 'Text' },
    { internalName: 'Reviewer', kind: 'Text' },
    { internalName: 'CreatedAtIso', kind: 'Text' },
    { internalName: 'UpdatedAtIso', kind: 'Text' },
    { internalName: 'Views', kind: 'Number' },
    { internalName: 'Task', kind: 'Text', displayName: 'Task' },
    { internalName: 'TaskListTitle', kind: 'Text' },
    { internalName: 'TaskItemId', kind: 'Number' },
    { internalName: 'TaggedUsers', kind: 'UserMulti' },
    { internalName: 'Portfolio', kind: 'Lookup', lookupListGuid: masterTasksGuid, lookupShowField: 'Title' },
    { internalName: 'Project', kind: 'Lookup', lookupListGuid: masterTasksGuid, lookupShowField: 'Title' },
    { internalName: 'TagsJson', kind: 'Note' },
    { internalName: 'TechJson', kind: 'Note' },
    { internalName: 'DetailsJson', kind: 'Note' },
    { internalName: 'AttachmentsJson', kind: 'Note' },
    { internalName: 'EvidenceJson', kind: 'Note' },
    { internalName: 'RelatedEntryIdsJson', kind: 'Note' },
    { internalName: 'CommentsJson', kind: 'Note' },
    { internalName: 'VersionsJson', kind: 'Note' },
    { internalName: 'FeedbackJson', kind: 'Note' },
    { internalName: 'VerificationJson', kind: 'Note' },
  ]
}

/**
 * Idempotent — safe to click more than once. Creates the knowledgebase list
 * if missing, then adds whichever columns from fieldDefs() aren't already
 * there. Never touches Master Tasks itself, only reads its list Id to wire
 * the two Lookup columns.
 */
export async function provisionKnowledgeBaseList(onProgress?: (step: string, done: number, total: number) => void): Promise<void> {
  onProgress?.(`Creating "${sharepointConfig.listName}" list`, 0, 1)
  await ensureList(sharepointConfig.listName, 'Hochhuth Knowledge Hub entries')

  onProgress?.(`Reading "${MASTER_TASKS_LIST}" list id`, 0, 1)
  const masterTasksGuid = await getListGuid(MASTER_TASKS_LIST)

  const defs = fieldDefs(masterTasksGuid)
  await ensureFields(sharepointConfig.listName, defs, (done, total) => onProgress?.('Adding columns', done, total))
}
