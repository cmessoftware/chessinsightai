import { describe, expect, it } from 'vitest'
import { formatCoachGameDescription, formatTimeControlDisplay } from './coachGameDisplay.js'

describe('coachGameDisplay', () => {
    it('formats seconds TimeControl as minutes+increment', () => {
        expect(formatTimeControlDisplay('900+10')).toBe('15+10')
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
