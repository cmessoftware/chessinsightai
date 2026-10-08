import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import {
    assessDecisionPoint,
    detectNotableCritical,
    orderTopMovesByCategory,
    runAntiBlunderChecks,
    suggestPauseSeconds,
} from './coachMental1600.js'

function playSans(fen, sans) {
    const chess = new Chess(fen)
    for (const san of sans) {
        chess.move(san)
    }
    return chess.fen()
}

describe('coachMental1600', () => {
    it('starting position is fast mode with C1 step', () => {
        const result = assessDecisionPoint({ fen: new Chess().fen(), playerElo: 1600 })
        expect(result.mode).toBe('fast')
        expect(result.pause_seconds).toBe(10)
        expect(result.thinking_plan.some((s) => s.node_id === 'C1')).toBe(true)
    })

    it('large eval shift triggers critical + E11', () => {
        const result = assessDecisionPoint({
            fen: new Chess().fen(),
            scoreDiffBefore: 20,
            scoreDiffAfter: 150,
        })
        expect(result.mode).toBe('critical')
        expect(result.triggers.some((t) => t.code === 'E11')).toBe(true)
        expect(result.mapped_07_reasons).toContain('EvaluationInstability')
    })

    it('quiet sicilian line after d6 is not critical from captures alone', () => {
        const fen = playSans(undefined, ['e4', 'c5', 'd4', 'd6'])
        const result = assessDecisionPoint({ fen })
        expect(result.mode).toBe('fast')
        expect(result.triggers.some((t) => t.code === 'E2')).toBe(false)
    })

    it('exd4 recapture position is critical (notable)', () => {
        const fen = playSans(undefined, ['e4', 'e5', 'd4', 'exd4'])
        const prior = playSans(undefined, ['e4', 'e5', 'd4'])
        const chessPrior = new Chess(prior)
        const exd4 = chessPrior.moves({ verbose: true }).find((m) => m.san === 'exd4')
        const notable = detectNotableCritical(new Chess(fen), exd4)
        expect(notable.length).toBeGreaterThan(0)
        const result = assessDecisionPoint({
            fen,
            lastOpponentMoveUci: `${exd4.from}${exd4.to}`,
            grandparentFen: prior,
        })
        expect(result.mode).toBe('critical')
    })

    it('suggestPauseSeconds respects elo bands', () => {
        expect(suggestPauseSeconds('rapid', 1300)).toBe(8)
        expect(suggestPauseSeconds('rapid', 1900)).toBe(15)
    })

    it('orders multipv by D1–D5 priority', () => {
        const chess = new Chess()
        chess.move('e4')
        chess.move('e5')
        const fen = chess.fen()
        const ordered = orderTopMovesByCategory(new Chess(fen), ['d2d4', 'g1f3', 'f1c4'])
        expect(ordered.length).toBeGreaterThan(0)
        expect(ordered[0].category).toBeDefined()
    })

    it('runAntiBlunderChecks flags obvious major capture allowed', () => {
        const fen = 'rnbqkb1r/pppp1ppp/5n2/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3'
        const chess = new Chess(fen)
        const qxf7 = chess.moves({ verbose: true }).find((m) => m.san === 'Qxf7+')
        expect(qxf7).toBeTruthy()
        const failed = runAntiBlunderChecks(chess, qxf7)
        expect(failed).toContain('S3')
    })
})
