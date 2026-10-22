import { describe, expect, it } from 'vitest'
import { defaultCoachGameCategories, normalizeCoachGameCategories } from './coachGameCategoriesConfig.js'
import { resolveCoachGameCategory } from './coachGameCategory.js'

describe('coachGameCategoriesConfig', () => {
    it('keeps built-in ids when merging saved prefs', () => {
        const merged = normalizeCoachGameCategories([
            { id: 'torneo', label: 'Mis torneos', priority: 25, enabled: true, rules: [] },
        ])
        const torneo = merged.find((c) => c.id === 'torneo')
        expect(torneo?.label).toBe('Mis torneos')
        expect(merged.some((c) => c.id === 'lichess')).toBe(true)
    })

    it('uses custom category when rules match', () => {
        const cats = normalizeCoachGameCategories([
            ...defaultCoachGameCategories(),
            {
                id: 'custom_club',
                label: 'Club local',
                priority: 15,
                enabled: true,
                rules: [{ type: 'text_keywords', value: 'club local' }],
            },
        ])
        expect(
            resolveCoachGameCategory({ description: 'Partida club local 2024' }, cats).id,
        ).toBe('custom_club')
    })
})
