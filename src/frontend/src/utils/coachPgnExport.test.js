import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { createEmptyRoot } from './coachVariationTree.js'
import { formatMainLinePgnMovetext, formatTreePgnMovetext } from './coachPgnExport.js'

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

describe('formatMainLinePgnMovetext', () => {
    it('formats a short main line', () => {
        const root = buildMainLineRoot(['e4', 'e5', 'Nf3', 'Nc6'])
        expect(formatMainLinePgnMovetext(root)).toBe('1. e4 e5 2. Nf3 Nc6')
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
