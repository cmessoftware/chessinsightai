import { describe, expect, it } from 'vitest'
import {
    bulkEditIds,
    pruneSelection,
    selectionAfterLoad,
    selectionScope,
} from './coachGameSelection.js'

describe('coachGameSelection', () => {
    it('does not select the library when nothing was highlighted', () => {
        expect(selectionAfterLoad({ highlightIds: [], queueableIds: [1, 2, 3] })).toEqual([])
    })

    it('keeps only highlighted ids that can be queued', () => {
        expect(
            selectionAfterLoad({ highlightIds: [2, 9], queueableIds: [1, 2, 3] }),
        ).toEqual([2])
    })

    it('drops ids that disappeared and does not add new ones', () => {
        expect(pruneSelection([1, 2, 4], [2, 3, 5])).toEqual([2])
    })

    it('bulk edit uses only the given ids', () => {
        expect(bulkEditIds([])).toEqual([])
        expect(bulkEditIds([3, 3, 8])).toEqual([3, 8])
    })

    it('counts the page and the rows checked on other pages', () => {
        expect(selectionScope({ selectedIds: [1, 2, 9], pageIds: [1, 2, 3] })).toEqual({
            total: 3,
            onPage: 2,
            onOtherPages: 1,
        })
    })
})
