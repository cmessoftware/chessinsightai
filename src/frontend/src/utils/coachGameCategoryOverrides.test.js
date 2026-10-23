import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    COACH_GAME_CATEGORY_OVERRIDES_STORAGE_KEY,
    loadCoachGameCategoryOverrides,
    setCoachGameCategoryOverride,
    setCoachGameCategoryOverridesBulk,
} from './coachGameCategoryOverrides.js'

function mockLocalStorage() {
    /** @type {Record<string, string>} */
    const store = {}
    return {
        getItem: (key) => (key in store ? store[key] : null),
        setItem: (key, value) => {
            store[key] = String(value)
        },
        removeItem: (key) => {
            delete store[key]
        },
        clear: () => {
            for (const key of Object.keys(store)) delete store[key]
        },
    }
}

describe('coachGameCategoryOverrides', () => {
    beforeEach(() => {
        vi.stubGlobal('localStorage', mockLocalStorage())
        vi.stubGlobal('window', { dispatchEvent: vi.fn() })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('persists single and bulk overrides', () => {
        let map = setCoachGameCategoryOverride('a', 'torneo', {})
        expect(map).toEqual({ a: 'torneo' })
        expect(loadCoachGameCategoryOverrides()).toEqual({ a: 'torneo' })

        map = setCoachGameCategoryOverridesBulk(['a', 'b'], 'estudio', map)
        expect(map).toEqual({ a: 'estudio', b: 'estudio' })

        map = setCoachGameCategoryOverride('a', null, map)
        expect(map).toEqual({ b: 'estudio' })
    })
})
