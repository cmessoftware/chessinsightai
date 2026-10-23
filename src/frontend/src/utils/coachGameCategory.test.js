import { describe, expect, it } from 'vitest'
import {
    coachGameMatchesCategoryFilter,
    listCoachGameCategoryFilters,
    resolveCoachGameCategory,
} from './coachGameCategory.js'
import { defaultCoachGameCategories } from './coachGameCategoriesConfig.js'

const DEFAULTS = defaultCoachGameCategories()

describe('coachGameCategory', () => {
    it('detects estudio and torneo', () => {
        expect(resolveCoachGameCategory({ catalog_source: 'estudio' }, DEFAULTS).id).toBe(
            'estudio',
        )
        expect(
            resolveCoachGameCategory(
                { source: 'pgn', description: 'Torneo Club 2024' },
                DEFAULTS,
            ).id,
        ).toBe('torneo')
    })

    it('detects platforms and corpus', () => {
        expect(resolveCoachGameCategory({ catalog_source: 'lichess' }, DEFAULTS).id).toBe(
            'lichess',
        )
        expect(
            resolveCoachGameCategory({ corpus_type: 'fide', source: 'pgn' }, DEFAULTS).id,
        ).toBe('corpus_fide')
    })

    it('filters and aggregates counts', () => {
        const games = [
            { catalog_source: 'lichess' },
            { catalog_source: 'lichess' },
            { catalog_source: 'estudio' },
        ]
        const filters = listCoachGameCategoryFilters(games, DEFAULTS)
        expect(filters.find((f) => f.id === 'lichess')?.count).toBe(2)
        expect(coachGameMatchesCategoryFilter(games[0], 'lichess', DEFAULTS)).toBe(true)
        expect(coachGameMatchesCategoryFilter(games[2], 'lichess', DEFAULTS)).toBe(false)
    })

    it('applies manual override before rules', () => {
        const game = { id: 'g1', catalog_source: 'lichess' }
        const overrides = { g1: 'torneo' }
        expect(resolveCoachGameCategory(game, DEFAULTS, overrides).id).toBe('torneo')
        expect(resolveCoachGameCategory(game, DEFAULTS, overrides).manual).toBe(true)
        expect(
            coachGameMatchesCategoryFilter(game, 'torneo', DEFAULTS, overrides),
        ).toBe(true)
        expect(
            coachGameMatchesCategoryFilter(game, 'lichess', DEFAULTS, overrides),
        ).toBe(false)
    })
})
