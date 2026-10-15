import { describe, expect, it } from 'vitest'
import { COACH_PGN_IMPORT_MAX_GAMES, pgnMultiGameImportNotice } from './coachPgnImport.js'

describe('pgnMultiGameImportNotice', () => {
    it('returns null when all games in PGN were imported', () => {
        expect(
            pgnMultiGameImportNotice({
                pgn_total_games: 2,
                pgn_games_ignored: 0,
                count: 2,
            }),
        ).toBeNull()
    })

    it('warns when import was capped', () => {
        const msg = pgnMultiGameImportNotice({
            pgn_total_games: 150,
            pgn_games_ignored: 50,
            count: 100,
        })
        expect(msg).toContain('150')
        expect(msg).toContain('100')
        expect(msg).toContain(String(COACH_PGN_IMPORT_MAX_GAMES))
    })
})
