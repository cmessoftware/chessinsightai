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
})
