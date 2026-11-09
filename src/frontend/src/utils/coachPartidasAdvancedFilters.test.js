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

    it('sends the selected rhythms', () => {
        const query = buildCoachPartidasListQuery({
            ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
            rhythms: ['rapid', 'blitz'],
        })
        expect(query).toEqual({ rhythms: ['rapid', 'blitz'] })
    })

    it('sends a partial name of at least 3 characters', () => {
        const query = buildCoachPartidasListQuery({
            ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
            whitePlayer: 'car',
            blackPlayer: 'vi',
            studyName: 'ini',
        })
        expect(query).toEqual({
            white_player: 'car',
            study_name: 'ini',
        })
        expect(
            coachPartidasAdvancedFiltersActive({
                ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
                blackPlayer: 'vi',
            }),
        ).toBe(false)
    })

    it('sends the study name', () => {
        const query = buildCoachPartidasListQuery({
            ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
            studyName: 'Larsen',
        })
        expect(query).toEqual({ study_name: 'Larsen' })
        expect(
            coachPartidasAdvancedFiltersActive({
                ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
                studyName: 'Larsen',
            }),
        ).toBe(true)
    })

    it('sends the import date range', () => {
        const query = buildCoachPartidasListQuery({
            ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
            importedFrom: '2026-03-01',
            importedTo: '2026-03-31',
        })
        expect(query).toEqual({
            imported_from: '2026-03-01',
            imported_to: '2026-03-31',
        })
        expect(
            coachPartidasAdvancedFiltersActive({
                ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
                importedFrom: '2026-03-01',
            }),
        ).toBe(true)
    })

    it('keeps Fuente categories out of the API query', () => {
        const filters = {
            ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
            sourceIds: ['torneo', 'chesscom'],
        }
        expect(coachPartidasAdvancedFiltersActive(filters)).toBe(true)
        expect(buildCoachPartidasListQuery(filters)).toEqual({})
    })

    it('returns empty query when inactive', () => {
        expect(buildCoachPartidasListQuery(EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS)).toEqual({})
        expect(coachPartidasAdvancedFiltersActive(EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS)).toBe(
            false,
        )
    })
})
