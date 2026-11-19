import { describe, expect, it } from 'vitest'
import { STARTING_FEN } from './parseFenInput.js'
import {
    buildPositionStudyHeadersPgn,
    buildPositionStudyPgnFromTree,
    normalizePositionStudyName,
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