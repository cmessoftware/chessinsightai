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

    it('rapid keyword category ignores stale description when clock is blitz', () => {
        const cats = [
            ...DEFAULTS,
            {
                id: 'rapid',
                label: 'Rapid',
                priority: 5,
                enabled: true,
                rules: [{ type: 'text_keywords', value: 'rapid' }],
            },
            {
                id: 'blitz_cat',
                label: 'Blitz',
                priority: 4,
                enabled: true,
                rules: [{ type: 'text_keywords', value: 'blitz' }],
            },
        ]
        const game = {
            speed_class: 'rapid',
            time_control: '300+0',
            description: 'Alice vs Bob (Rapid 5+0)',
            source: 'analysis',
        }
        expect(resolveCoachGameCategory(game, cats).id).toBe('blitz_cat')
        expect(coachGameMatchesCategoryFilter(game, 'rapid', cats)).toBe(false)
        expect(coachGameMatchesCategoryFilter(game, 'blitz_cat', cats)).toBe(true)
    })

    it('speed_class rule uses Lichess clock not stored speed_class', () => {
        const cats = [
            ...DEFAULTS,
            {
                id: 'rapid',
                label: 'Rapid',
                priority: 5,
                enabled: true,
                rules: [{ type: 'speed_class', value: 'rapid' }],
            },
        ]
        const blitzFive = {
            speed_class: 'rapid',
            time_control: '300+0',
            source: 'analysis',
        }
        expect(coachGameMatchesCategoryFilter(blitzFive, 'rapid', cats)).toBe(false)
        const rapidFifteen = { speed_class: 'blitz', time_control: '900+10', source: 'analysis' }
        expect(coachGameMatchesCategoryFilter(rapidFifteen, 'rapid', cats)).toBe(true)
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
