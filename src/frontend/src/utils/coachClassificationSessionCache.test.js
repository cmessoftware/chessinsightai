import { describe, expect, it, beforeEach } from 'vitest'
import {
    isClassificationCacheable,
    mainLineSignature,
    pruneClassificationCache,
    saveClassificationSessionCache,
    loadClassificationSessionCache,
    clearClassificationSessionCache,
} from './coachClassificationSessionCache.js'
import { Chess } from 'chess.js'
import { createEmptyRoot } from './coachVariationTree.js'

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
    return { root, ucis }
}

describe('coachClassificationSessionCache CA-7', () => {
    /** @type {Record<string, string>} */
    const store = {}

    beforeEach(() => {
        Object.keys(store).forEach((k) => delete store[k])
        global.sessionStorage = {
            getItem: (k) => store[k] ?? null,
            setItem: (k, v) => {
                store[k] = v
            },
            removeItem: (k) => {
                delete store[k]
            },
        }
        clearClassificationSessionCache('game-1')
    })

    it('main line signature ignores variation branches', () => {
        const { root, ucis } = buildSimpleMainLine(['e4', 'e5', 'Nf3'])
        root.children[0].children.push({
            id: 'var',
            san: 'c5',
            uci: 'c7c5',
            fen: root.children[0].children[0].fen,
            fromGame: false,
            children: [],
        })
        const sigMain = mainLineSignature(root)
        expect(sigMain).toContain(`0:${ucis[0]}`)
        expect(sigMain).not.toContain('c7c5')
    })

    it('prunes cache to current main-line path keys', () => {
        const valid = new Set(['0', '0.0'])
        const pruned = pruneClassificationCache(
            { '0': { pathKey: '0' }, '0.0': {}, '0.0.1': {} },
            valid,
        )
        expect(Object.keys(pruned)).toEqual(['0', '0.0'])
    })

    it('persists and reloads by gameId + signature', () => {
        const row = { pathKey: '0', engineLabel: 'good', cpLoss: 0 }
        expect(isClassificationCacheable(row)).toBe(true)
        saveClassificationSessionCache({
            gameId: 'game-1',
            depth: 12,
            multipv: 3,
            mainLineSignature: '0:e2e4',
            eloKey: '1500|1500',
            byPathKey: { '0': row },
        })
        const loaded = loadClassificationSessionCache({
            gameId: 'game-1',
            depth: 12,
            multipv: 3,
            mainLineSignature: '0:e2e4',
            eloKey: '1500|1500',
        })
        expect(loaded?.byPathKey['0'].engineLabel).toBe('good')
        const miss = loadClassificationSessionCache({
            gameId: 'game-1',
            depth: 12,
            multipv: 3,
            mainLineSignature: '0:d2d4',
            eloKey: '1500|1500',
        })
        expect(miss).toBeNull()
    })
})
