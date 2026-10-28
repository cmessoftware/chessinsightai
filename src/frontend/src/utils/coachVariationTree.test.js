import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import {
    canAddVariationSibling,
    createEmptyRoot,
    moveNumberFromPlyCount,
    deleteLeafMoveAtPath,
    truncateLineForward,
    truncateTouchesImportedMoves,
    variationBranchHeadPath,
    variationNestDepth,
} from './coachVariationTree.js'

function buildSimpleMainLine(sans) {
    const chess = new Chess()
    const fens = [chess.fen()]
    const ucis = []
    const moves = []
    for (const san of sans) {
        const m = chess.move(san)
        ucis.push(m.from + m.to + (m.promotion || ''))
        fens.push(chess.fen())
        moves.push({ san: m.san })
    }
    const root = createEmptyRoot(fens[0])
    let node = root
    for (let i = 0; i < moves.length; i += 1) {
        node.children.push({
            id: `g-${i}`,
            san: moves[i].san,
            uci: ucis[i],
            fen: fens[i + 1],
            fromGame: true,
            children: [],
        })
        node = node.children[0]
    }
    return root
}

describe('moveNumberFromPlyCount', () => {
    it('maps plies to PGN move numbers', () => {
        expect(moveNumberFromPlyCount(0)).toBe(0)
        expect(moveNumberFromPlyCount(1)).toBe(1)
        expect(moveNumberFromPlyCount(2)).toBe(1)
        expect(moveNumberFromPlyCount(3)).toBe(2)
        expect(moveNumberFromPlyCount(48)).toBe(24)
    })
})

describe('variationNestDepth', () => {
    it('counts non-zero path indices', () => {
        expect(variationNestDepth([0, 0, 1, 0])).toBe(1)
        expect(variationNestDepth([0, 0, 1, 0, 2])).toBe(2)
    })
})

describe('variationBranchHeadPath', () => {
    it('returns path to branch head', () => {
        expect(variationBranchHeadPath([0, 0, 1, 0, 2])).toEqual([0, 0, 1])
    })
})

describe('deleteLeafMoveAtPath', () => {
    it('removes user leaf in a variation', () => {
        const root = buildSimpleMainLine(['e4', 'e5'])
        const afterE4 = root.children[0]
        afterE4.children.push({
            id: 'v1',
            san: 'c5',
            uci: 'c7c5',
            fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
            fromGame: false,
            children: [],
        })
        const out = deleteLeafMoveAtPath(root, [0, 1])
        expect(out.tree.children[0].children).toHaveLength(1)
        expect(out.tree.children[0].children[0].san).toBe('e5')
    })
})

describe('truncateLineForward', () => {
    it('clears continuations from path', () => {
        const root = buildSimpleMainLine(['e4', 'e5', 'Nf3'])
        const path = [0, 0]
        expect(truncateTouchesImportedMoves(root, path)).toBe(true)
        const out = truncateLineForward(root, path)
        expect(out.tree.children[0].children[0].children).toEqual([])
    })
})

describe('canAddVariationSibling', () => {
    it('allows up to two branch indices in path', () => {
        expect(canAddVariationSibling([0, 0, 1, 0])).toBe(true)
        expect(canAddVariationSibling([0, 0, 1, 0, 2])).toBe(false)
    })
})
