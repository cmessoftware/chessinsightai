import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import {
    collectMainLinePlies,
    collectMainLinePlayerPlies,
    pathKeyFromPath,
} from './coachPlyClassification.js'

function buildMiniTree(moves) {
    const chess = new Chess()
    const root = {
        id: 'root',
        fen: chess.fen(),
        children: [],
    }
    let node = root
    moves.forEach((san, i) => {
        const played = chess.move(san)
        const child = {
            id: `g-${i}`,
            san: played.san,
            uci: played.from + played.to + (played.promotion || ''),
            fen: chess.fen(),
            fromGame: true,
            children: [],
        }
        node.children.push(child)
        node = child
    })
    return root
}

describe('collectMainLinePlayerPlies', () => {
    it('lists only white plies when player is white', () => {
        const root = buildMiniTree(['e4', 'e5', 'Nf3', 'Nc6'])
        const jobs = collectMainLinePlayerPlies(root, 'white')
        expect(jobs.map((j) => j.san)).toEqual(['e4', 'Nf3'])
        expect(jobs[0].fenBefore).toMatch(/rnbqkbnr/)
        expect(jobs[0].playedUci).toBe('e2e4')
    })

    it('lists only black plies when player is black', () => {
        const root = buildMiniTree(['e4', 'e5', 'Nf3'])
        const jobs = collectMainLinePlayerPlies(root, 'black')
        expect(jobs.map((j) => j.san)).toEqual(['e5'])
    })

    it('pathKey is stable', () => {
        expect(pathKeyFromPath([0, 0, 0])).toBe('0.0.0')
        expect(pathKeyFromPath([])).toBe('root')
    })

    it('collectMainLinePlies includes both colors', () => {
        const root = buildMiniTree(['e4', 'e5', 'Nf3'])
        expect(collectMainLinePlies(root)).toHaveLength(3)
        expect(collectMainLinePlies(root)[1].moverColor).toBe('black')
    })
})
