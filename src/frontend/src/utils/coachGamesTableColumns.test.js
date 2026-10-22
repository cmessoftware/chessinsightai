import { describe, expect, it } from 'vitest'
import {
    defaultVisibleCoachGamesColumns,
    normalizeVisibleCoachGamesColumns,
} from './coachGamesTableColumns.js'

describe('coachGamesTableColumns', () => {
    it('defaults include all columns', () => {
        const set = defaultVisibleCoachGamesColumns()
        expect(set.has('partida')).toBe(true)
        expect(set.has('eco')).toBe(true)
        expect(set.has('actions')).toBe(true)
    })

    it('always keeps locked columns when user hides everything else', () => {
        const next = normalizeVisibleCoachGamesColumns(['eco'])
        expect(next.has('partida')).toBe(true)
        expect(next.has('actions')).toBe(true)
        expect(next.has('eco')).toBe(true)
        expect(next.has('opening')).toBe(false)
    })
})
