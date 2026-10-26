import { describe, expect, it } from 'vitest'
import {
    buildCoachPartidasListQuery,
    coachPartidasAdvancedFiltersActive,
    EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
} from './coachPartidasAdvancedFilters.js'

describe('coachPartidasAdvancedFilters', () => {
    it('builds API query from draft filters', () => {
        const query = buildCoachPartidasListQuery({
            ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
            corpusTypes: ['personal', 'fide'],
            eco: 'C5*',
            results: ['1-0'],
            whitePlayer: 'Alice',
        })
        expect(query).toEqual({
            corpus_types: ['personal', 'fide'],
            eco: 'C5*',
            results: ['1-0'],
            white_player: 'Alice',
        })
    })

    it('sends eco and opening when catalog row selected', () => {
        const query = buildCoachPartidasListQuery({
            ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
            openingCatalog: { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation' },
        })
        expect(query).toEqual({
            eco: 'B90',
            opening: '*Sicilian Defense: Najdorf Variation*',
            opening_eco_or: true,
        })
    })

    it('returns empty query when inactive', () => {
        expect(buildCoachPartidasListQuery(EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS)).toEqual({})
        expect(coachPartidasAdvancedFiltersActive(EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS)).toBe(
            false,
        )
    })
})
