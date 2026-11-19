import { describe, expect, it } from 'vitest'
import { STARTING_FEN } from './parseFenInput.js'
import {
    buildPositionStudyHeadersPgn,
    buildPositionStudyPgnFromTree,
    normalizePositionStudyName,
    suggestForkStudyName,
} from './coachPositionStudyPgn.js'
import { buildTreeFromMainLine } from './coachVariationTree.js'
import { Chess } from 'chess.js'

describe('coachPositionStudyPgn', () => {
    it('uses custom StudyName when provided', () => {
        const r = buildPositionStudyHeadersPgn(STARTING_FEN, { studyName: 'Táctica final' })
        expect(r.ok).toBe(true)
        expect(r.sourcePgn).toContain('[StudyName "Táctica final"]')
    })

    it('rejects empty study name', () => {
        expect(normalizePositionStudyName('   ').ok).toBe(false)
    })

    it('builds SetUp/FEN headers for a position', () => {
        const r = buildPositionStudyHeadersPgn(STARTING_FEN)
        expect(r.ok).toBe(true)
        expect(r.sourcePgn).toContain('[SetUp "1"]')
        expect(r.sourcePgn).toContain('[FEN "')
        expect(r.sourcePgn).toContain('[StudyName "Posición"]')
        expect(r.sourcePgn).toMatch(/\*\s*$/)
    })

    it('suggests fork study name from headers and ply', () => {
        const pgn = '[Event "Capablanca — Alekhine"]\n\n1. e4'
        expect(suggestForkStudyName(pgn, [])).toBe('Capablanca — Alekhine · inicio')
        expect(suggestForkStudyName(pgn, [0])).toBe('Capablanca — Alekhine · jug. 1')
    })

    it('includes movetext when the tree has moves', () => {
        const chess = new Chess(STARTING_FEN)
        chess.move('e4')
        const root = buildTreeFromMainLine(
            [STARTING_FEN, chess.fen()],
            ['e2e4'],
            [{ san: 'e4', uci: 'e2e4' }],
        )
        const r = buildPositionStudyPgnFromTree(root)
        expect(r.ok).toBe(true)
        expect(r.pgn).toContain('1. e4')
        expect(r.pgn).toContain('[FEN "')
    })
})