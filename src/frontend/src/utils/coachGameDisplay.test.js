import { describe, expect, it } from 'vitest'
import { formatCoachGameDescription, formatTimeControlDisplay } from './coachGameDisplay.js'

describe('coachGameDisplay', () => {
    it('formats seconds TimeControl as minutes+increment', () => {
        expect(formatTimeControlDisplay('900+10')).toBe('15+10')
    })

    it('formats correspondence TimeControl as days', () => {
        expect(formatTimeControlDisplay('1/86400')).toBe('1 día')
        expect(formatTimeControlDisplay('1/259200')).toBe('3 días')
    })

    it('builds correspondence game description', () => {
        expect(
            formatCoachGameDescription({
                white_player: 'manuelfrp79',
                black_player: 'cmess1315',
                player_username: 'cmess1315',
                speed_class: 'daily',
                time_control: '1/259200',
            }),
        ).toBe('manuelfrp79 vs cmess1315 · POV cmess1315 (Correspondencia 3 días)')
    })

    it('builds full game description', () => {
        expect(
            formatCoachGameDescription({
                white_player: 'Frontallappen',
                black_player: 'cmess1315',
                player_username: 'cmess1315',
                speed_class: 'rapid',
                time_control: '900+10',
            }),
        ).toBe('Frontallappen vs cmess1315 · POV cmess1315 (Rapid 15+10)')
    })
})
