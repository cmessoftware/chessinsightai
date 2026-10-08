import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import {
    canAddVariationSibling,
    createEmptyRoot,
    truncateLineForward,
    truncateTouchesImportedMoves,
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

describe('variationNestDepth', () => {
    it('counts non-zero path indices', () => {
        expect(variationNestDepth([0, 0, 1, 0])).toBe(1)
        expect(variationNestDepth([0, 0, 1, 0, 2])).toBe(2)
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
