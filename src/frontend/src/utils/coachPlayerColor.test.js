import { describe, expect, it } from 'vitest'
import { coachDeepAnalysisUsername, resolveCoachPlayerColor } from './coachPlayerColor.js'

describe('resolveCoachPlayerColor', () => {
    it('uses explicit player_color', () => {
        expect(resolveCoachPlayerColor({ player_color: 'black' })).toBe('black')
    })

    it('infers from player_username vs PGN names', () => {
        expect(
            resolveCoachPlayerColor({
                player_username: 'cmess1315',
                white_player: 'alice',
                black_player: 'cmess1315',
            }),
        ).toBe('black')
    })

    it('defaults to white', () => {
        expect(resolveCoachPlayerColor({})).toBe('white')
    })
})

describe('coachDeepAnalysisUsername', () => {
    it('keeps the saved player username', () => {
        expect(
            coachDeepAnalysisUsername({
                player_username: 'cmess1315',
                white_player: 'Alice',
                black_player: 'cmess1315',
            }),
        ).toBe('cmess1315')
    })

    it('uses the PGN name of the resolved color', () => {
        expect(
            coachDeepAnalysisUsername({
                player_color: 'black',
                white_player: 'Alice',
                black_player: 'Bob',
            }),
        ).toBe('Bob')
    })
})
