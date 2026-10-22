import { describe, expect, it } from 'vitest'
import { buildReplayFromPgn, extractFirstGamePgnText } from './coachPgnReplay.js'

const MULTI = `[Event "One"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 1-0

[Event "Two"]
[White "Carol"]
[Black "Dan"]
[Result "0-1"]

1. d4 d5 0-1
`

describe('extractFirstGamePgnText', () => {
    it('keeps a single-game PGN unchanged', () => {
        const one = MULTI.split(/\n\n(?=\[)/)[0]
        expect(extractFirstGamePgnText(one)).toBe(one.trim())
    })

    it('isolates the first game from a multi-game blob', () => {
        const first = extractFirstGamePgnText(MULTI)
        expect(first).toContain('Alice')
        expect(first).not.toContain('Carol')
    })
})

describe('buildReplayFromPgn', () => {
    it('replays moves from multi-game PGN using only the first game', () => {
        const built = buildReplayFromPgn(MULTI)
        expect(built.moveCount).toBe(2)
        expect(built.moves[0]?.san).toBe('e4')
    })

    it('starts from a FEN study even without SetUp header', () => {
        const study = `[FEN "4rkn1/p1q4p/1p2Q1p1/4P1N1/b1p4P/2P1P3/6P1/4R1K1 b - - 0 1"]

1... Re7 2. Rf1+ Kg7 3. h5 Be8 4. h6+ Kh8 5. Qd6 Qc5 6. Qd4 Rxe5 7. Rf7 Nxh6 8. Rf8+ Qxf8 9. Qxe5+ Kg8
`
        const built = buildReplayFromPgn(study)
        expect(built.fens[0]).toContain('4rkn1/p1q4p/1p2Q1p1/4P1N1/b1p4P/2P1P3/6P1/4R1K1')
        expect(built.moves[0]?.san).toBe('Re7')
        expect(built.moveCount).toBeGreaterThan(0)
        expect(built.fens[0]).not.toMatch(/^rnbqkbnr\/pppppppp/)
    })
})
