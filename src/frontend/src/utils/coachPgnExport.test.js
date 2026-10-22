import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { FEN_STUDY_PGN } from './coachPgnFixtures.js'
import { buildReplayFromPgn } from './coachPgnReplay.js'
import { buildTreeFromMainLine, createEmptyRoot } from './coachVariationTree.js'
import {
    buildPgnClipboardText,
    extractPgnHeadersBlock,
    formatMainLinePgnMovetext,
    formatTreePgnMovetext,
} from './coachPgnExport.js'

function buildMainLineRoot(sans) {
    const chess = new Chess()
    const root = createEmptyRoot(chess.fen())
    let node = root
    for (let i = 0; i < sans.length; i += 1) {
        const m = chess.move(sans[i])
        node.children.push({
            id: `n-${i}`,
            san: m.san,
            uci: m.from + m.to + (m.promotion || ''),
            fen: chess.fen(),
            fromGame: true,
            children: [],
        })
        node = node.children[0]
    }
    return root
}

describe('extractPgnHeadersBlock', () => {
    it('returns tag pairs before movetext', () => {
        const pgn = `[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "*"]

1. e4 e5`
        expect(extractPgnHeadersBlock(pgn)).toBe(
            '[Event "Test"]\n[White "Alice"]\n[Black "Bob"]\n[Result "*"]',
        )
    })

    it('includes FEN and SetUp headers', () => {
        const pgn = `[SetUp "1"]
[FEN "4rkn1/p1q4p/1p2Q1p1/4P1N1/b1p4P/2P1P3/6P1/4R1K1 b - - 0 1"]

1... Re7`
        const headers = extractPgnHeadersBlock(pgn)
        expect(headers).toContain('[SetUp "1"]')
        expect(headers).toContain('[FEN "4rkn1')
    })
})

describe('buildPgnClipboardText', () => {
    it('prepends headers to movetext', () => {
        const source = `[Event "X"]
[White "W"]

1. d4`
        const out = buildPgnClipboardText('1. d4 d5 1-0', source)
        expect(out).toMatch(/^\[Event "X"\]/)
        expect(out).toContain('\n\n1. d4 d5 1-0')
    })

    it('returns movetext only when source has no headers', () => {
        expect(buildPgnClipboardText('1. e4', '1. e4 e5')).toBe('1. e4')
    })
})

describe('formatMainLinePgnMovetext', () => {
    it('formats a short main line', () => {
        const root = buildMainLineRoot(['e4', 'e5', 'Nf3', 'Nc6'])
        expect(formatMainLinePgnMovetext(root)).toBe('1. e4 e5 2. Nf3 Nc6')
    })

    it('numbers from FEN when black moves first', () => {
        const built = buildReplayFromPgn(FEN_STUDY_PGN)
        const tree = buildTreeFromMainLine(built.fens, built.ucis, built.moves)
        const text = formatMainLinePgnMovetext(tree)
        expect(text.startsWith('1... Re7')).toBe(true)
        expect(text).toContain('2. Rf1+')
    })

    it('appends result when provided', () => {
        const root = buildMainLineRoot(['e4', 'e5'])
        expect(formatMainLinePgnMovetext(root, { result: '1/2-1/2' })).toBe('1. e4 e5 1/2-1/2')
    })

    it('returns empty for root only', () => {
        const root = createEmptyRoot()
        expect(formatMainLinePgnMovetext(root)).toBe('')
    })
})

describe('formatTreePgnMovetext', () => {
    it('includes sibling branches in parentheses', () => {
        const root = buildMainLineRoot(['e4', 'e5', 'Nf3'])
        const afterE4 = root.children[0]
        afterE4.children.push({
            id: 'alt-c5',
            san: 'c5',
            uci: 'c7c5',
            fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
            fromGame: false,
            children: [],
        })
        const text = formatTreePgnMovetext(root)
        expect(text).toContain('1. e4')
        expect(text).toContain('(1... c5)')
        expect(text).toContain('e5')
        expect(text).toContain('2. Nf3')
    })
})
