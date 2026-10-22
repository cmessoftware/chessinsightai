import { describe, expect, it } from 'vitest'
import {
    coachGamePlayersLabel,
    formatCoachCatalogSource,
    formatCoachDatePlayed,
    formatCoachGameDescription,
    formatTimeControlDisplay,
} from './coachGameDisplay.js'

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

    it('formats Chess.com correspondence days, not 1s+0', () => {
        expect(formatTimeControlDisplay('1/86400', 'daily')).toBe('1 día')
        expect(
            formatCoachGameDescription({
                white_player: 'cmess4401',
                black_player: 'Ejemplo: RajaDogor16',
                player_username: 'cmess4401',
                speed_class: 'daily',
                time_control: '1/86400',
                description:
                    'cmess4401 vs Ejemplo: RajaDogor16 · POV cmess4401 (Correspondencia 1s+0)',
            }),
        ).toBe('cmess4401 vs Ejemplo: RajaDogor16 · POV cmess4401 (Correspondencia 1s+0)')
    })

    it('uses custom display_title for players label', () => {
        expect(
            coachGamePlayersLabel({
                white_player: 'Alice',
                black_player: 'Bob',
                display_title: 'Torneo A: Alice vs Bob',
            }),
        ).toBe('Torneo A: Alice vs Bob')
    })

    it('formats PGN dates and catalog source', () => {
        expect(formatCoachDatePlayed('2024.03.15')).toBe('15/03/2024')
        expect(formatCoachCatalogSource({ catalog_source: 'lichess' })).toBe('lichess')
    })
})
