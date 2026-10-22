import { describe, expect, it } from 'vitest'
import { buildTreeFromMainLine } from './coachVariationTree.js'
import {
    buildPgnClipboardText,
    formatMainLinePgnMovetext,
} from './coachPgnExport.js'
import { FEN_STUDY_PGN } from './coachPgnFixtures.js'
import {
    buildReplayFromPgn,
    ensurePgnSetupHeader,
    extractFirstGamePgnText,
} from './coachPgnReplay.js'

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

describe('ensurePgnSetupHeader', () => {
    it('forces SetUp 1 when FEN is present', () => {
        const withZero = `[SetUp "0"]
[FEN "4rkn1/p1q4p/1p2Q1p1/4P1N1/b1p4P/2P1P3/6P1/4R1K1 b - - 0 1"]`
        expect(ensurePgnSetupHeader(withZero)).toContain('[SetUp "1"]')
    })
})

describe('buildReplayFromPgn', () => {
    it('replays moves from multi-game PGN using only the first game', () => {
        const built = buildReplayFromPgn(MULTI)
        expect(built.error).toBeNull()
        expect(built.moveCount).toBe(2)
        expect(built.moves[0]?.san).toBe('e4')
    })

    it('replays the full FEN study fixture', () => {
        const built = buildReplayFromPgn(FEN_STUDY_PGN)
        expect(built.error).toBeNull()
        expect(built.moveCount).toBe(17)
        expect(built.fens).toHaveLength(18)
        expect(built.moves[0]?.san).toBe('Re7')
        expect(built.fens[0]).toContain('4rkn1/p1q4p/1p2Q1p1/4P1N1/b1p4P/2P1P3/6P1/4R1K1')
        expect(built.fens[0]).not.toMatch(/^rnbqkbnr\/pppppppp/)
    })

    it('accepts FEN-only studies without movetext', () => {
        const fenOnly = `[FEN "4rkn1/p1q4p/1p2Q1p1/4P1N1/b1p4P/2P1P3/6P1/4R1K1 b - - 0 1"]`
        const built = buildReplayFromPgn(fenOnly)
        expect(built.error).toBeNull()
        expect(built.moveCount).toBe(0)
        expect(built.fens).toHaveLength(1)
    })

    it('flags invalid movetext separately from empty studies', () => {
        const bad = `${FEN_STUDY_PGN.split('\n\n')[0]}

1... Re7 2. QQQQ`
        const built = buildReplayFromPgn(bad)
        expect(built.error).toBe('invalid_movetext')
        expect(built.moveCount).toBeLessThan(17)
    })

    it('flags invalid FEN headers', () => {
        const built = buildReplayFromPgn('[FEN "not-a-fen"]\n\n1. e4')
        expect(built.error).toBe('invalid_fen')
    })
})

describe('FEN study import → export → reimport', () => {
    it('preserves positions and UCI sequence through clipboard PGN', () => {
        const first = buildReplayFromPgn(FEN_STUDY_PGN)
        expect(first.error).toBeNull()
        const tree = buildTreeFromMainLine(first.fens, first.ucis, first.moves)
        const movetext = formatMainLinePgnMovetext(tree)
        expect(movetext).toMatch(/^1\.\.\. Re7/)
        const clipboard = buildPgnClipboardText(movetext, FEN_STUDY_PGN)
        const second = buildReplayFromPgn(clipboard)
        expect(second.error).toBeNull()
        expect(second.moveCount).toBe(first.moveCount)
        expect(second.ucis).toEqual(first.ucis)
        expect(second.fens.at(-1)).toBe(first.fens.at(-1))
    })
})
