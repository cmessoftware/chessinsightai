import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import {
    canAddVariationSibling,
    createEmptyRoot,
    moveNumberFromPlyCount,
    deleteLeafMoveAtPath,
    demoteMainLineAtPath,
    promotePathToMainLine,
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

    it('removes the last move of the imported main line', () => {
        const root = buildSimpleMainLine(['e4', 'e5', 'Nf3'])
        const out = deleteLeafMoveAtPath(root, [0, 0, 0])
        expect(out.tree.children[0].children[0].children).toEqual([])
        expect(out.path).toEqual([0, 0])
        expect(out.tree.children[0].children[0].san).toBe('e5')
    })
})

describe('promotePathToMainLine', () => {
    it('makes the secondary line the main line and keeps the old line as a variation', () => {
        const root = buildSimpleMainLine(['e4', 'e5', 'Nf3'])
        const afterE4 = root.children[0]
        const chess = new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')
        const c5 = chess.move('c5')
        afterE4.children.push({
            id: 'v-c5',
            san: c5.san,
            uci: c5.from + c5.to,
            fen: chess.fen(),
            fromGame: false,
            children: [],
        })
        const out = promotePathToMainLine(root, [0, 1])
        expect(out.path).toEqual([0, 0])
        expect(out.tree.children[0].children[0].san).toBe('c5')
        expect(out.tree.children[0].children[1].san).toBe('e5')
        expect(out.tree.children[0].children[1].children[0].san).toBe('Nf3')
    })
})

describe('demoteMainLineAtPath', () => {
    it('moves the main-line tail behind the existing variation', () => {
        const root = buildSimpleMainLine(['e4', 'e5', 'Nf3'])
        const afterE4 = root.children[0]
        const chess = new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')
        const c5 = chess.move('c5')
        afterE4.children.push({
            id: 'v-c5',
            san: c5.san,
            uci: c5.from + c5.to,
            fen: chess.fen(),
            fromGame: false,
            children: [],
        })
        const out = demoteMainLineAtPath(root, [0, 0])
        expect(out.path).toEqual([0, 1])
        expect(out.tree.children[0].children[0].san).toBe('c5')
        expect(out.tree.children[0].children[1].san).toBe('e5')
        expect(out.tree.children[0].children[1].children[0].san).toBe('Nf3')
    })

    it('does nothing when the main line has no alternative at that move', () => {
        const root = buildSimpleMainLine(['e4', 'e5'])
        expect(demoteMainLineAtPath(root, [0, 0])).toBeNull()
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
