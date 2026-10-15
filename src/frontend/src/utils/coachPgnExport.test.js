import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { createEmptyRoot } from './coachVariationTree.js'
import { formatMainLinePgnMovetext } from './coachPgnExport.js'

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
