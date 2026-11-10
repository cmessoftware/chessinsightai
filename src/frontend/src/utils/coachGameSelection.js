/** Ids to check after load. Import highlight only; never the whole library. */
export function selectionAfterLoad({ highlightIds = [], queueableIds = [] } = {}) {
    if (!highlightIds?.length) return []
    const queueable = new Set(queueableIds)
    return highlightIds.filter((id) => queueable.has(id))
}

/** Drop ids that left the list. Never adds ids that a refresh just loaded. */
export function pruneSelection(selectedIds, validIds) {
    const valid = validIds instanceof Set ? validIds : new Set(validIds)
    return [...selectedIds].filter((id) => valid.has(id))
}

/** Bulk edit targets. Empty selection is a no-op, not "all games". */
export function bulkEditIds(selectedIds) {
    return [...new Set(selectedIds)].filter((id) => id != null && id !== '')
}

/** How many checked rows are on this page versus the rest of the list. */
export function selectionScope({ selectedIds, pageIds = [] } = {}) {
    const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || [])
    const page = new Set(pageIds)
    let onPage = 0
    for (const id of selected) {
        if (page.has(id)) onPage += 1
    }
    return {
        total: selected.size,
        onPage,
        onOtherPages: selected.size - onPage,
    }
}
