import { describe, expect, it } from 'vitest'
import {
    classifyCpLoss,
    classifyMoveFromEvals,
    classificationPendingUserMessage,
    computeCpLoss,
    cpLossFromGap,
    DEFAULT_ENGINE_LABEL_THRESHOLDS,
    deriveMateStatus,
    evalGapCpVsBest,
    formatClassificationProgressLabel,
    normalizeFromWhitePov,
    scoreFromEngineLine,
} from './coachEngineLabels.js'

function cpScore(playerColor, cp) {
    return { playerColor, kind: 'cp', cp, mate: null }
}

function mateScore(playerColor, mate) {
    return { playerColor, kind: 'mate', cp: null, mate }
}

describe('classifyCpLoss (§8 boundary tests)', () => {
    const t = DEFAULT_ENGINE_LABEL_THRESHOLDS

    it('49 cp → good', () => {
        expect(classifyCpLoss(49, t)).toBe('good')
    })
    it('50 cp → inaccuracy', () => {
        expect(classifyCpLoss(50, t)).toBe('inaccuracy')
    })
    it('99 cp → inaccuracy', () => {
        expect(classifyCpLoss(99, t)).toBe('inaccuracy')
    })
    it('100 cp → mistake', () => {
        expect(classifyCpLoss(100, t)).toBe('mistake')
    })
    it('299 cp → mistake', () => {
        expect(classifyCpLoss(299, t)).toBe('mistake')
    })
    it('300 cp → blunder', () => {
        expect(classifyCpLoss(300, t)).toBe('blunder')
    })
    it('0 cp → good', () => {
        expect(classifyCpLoss(0, t)).toBe('good')
    })
})

describe('cpLossFromGap', () => {
    it('negative gap → 0 (improvement vs engine line 1)', () => {
        expect(cpLossFromGap(-20)).toBe(0)
    })
    it('positive gap preserved', () => {
        expect(cpLossFromGap(120)).toBe(120)
    })
})

describe('computeCpLoss / evalGapCpVsBest', () => {
    it('matches spec formula max(0, best − played)', () => {
        const best = cpScore('white', 80)
        const played = cpScore('white', 20)
        expect(evalGapCpVsBest(best, played)).toBe(60)
        expect(computeCpLoss(best, played)).toBe(60)
        expect(classifyMoveFromEvals({ bestScore: best, playedScore: played }).engineLabel).toBe(
            'inaccuracy',
        )
    })

    it('rejects mixed player colors', () => {
        expect(() =>
            computeCpLoss(cpScore('white', 10), cpScore('black', 10)),
        ).toThrow(/mismatch/)
    })
})

describe('normalizeFromWhitePov', () => {
    it('black flips cp', () => {
        const s = normalizeFromWhitePov({ kind: 'cp', whiteCp: 40, playerColor: 'black' })
        expect(s).toEqual({ playerColor: 'black', kind: 'cp', cp: -40, mate: null })
    })
    it('black flips mate sign', () => {
        const s = normalizeFromWhitePov({ kind: 'mate', whiteMate: 3, playerColor: 'black' })
        expect(s.mate).toBe(-3)
    })
})

describe('scoreFromEngineLine', () => {
    const startpos = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'

    it('white to move, white player: positive cp stays', () => {
        const s = scoreFromEngineLine({ cp: 35, mate: null, fen: startpos, playerColor: 'white' })
        expect(s.cp).toBe(-35)
    })

    it('black analyzed, black to move: engine cp flipped to black POV', () => {
        const s = scoreFromEngineLine({ cp: 35, mate: null, fen: startpos, playerColor: 'black' })
        expect(s.playerColor).toBe('black')
        expect(s.cp).toBe(35)
    })
})

describe('mate handling (no cp label)', () => {
    it('missed forced mate → pending', () => {
        const best = mateScore('white', 3)
        const played = cpScore('white', 200)
        expect(deriveMateStatus(best, played)).toBe('missed_forced_mate')
        const r = classifyMoveFromEvals({ bestScore: best, playedScore: played })
        expect(r.engineLabel).toBe('pending')
        expect(r.mateStatus).toBe('missed_forced_mate')
        expect(r.cpLoss).toBeNull()
    })

    it('allowed opponent mate → pending', () => {
        const best = cpScore('white', 0)
        const played = mateScore('white', -2)
        expect(deriveMateStatus(best, played)).toBe('allowed_opponent_mate')
        expect(classifyMoveFromEvals({ bestScore: best, playedScore: played }).engineLabel).toBe(
            'pending',
        )
    })

    it('both cp → blunder at 300', () => {
        const best = cpScore('black', 400)
        const played = cpScore('black', 50)
        expect(classifyMoveFromEvals({ bestScore: best, playedScore: played }).engineLabel).toBe(
            'blunder',
        )
    })
})

describe('classification progress copy', () => {
    it('running and done labels', () => {
        expect(formatClassificationProgressLabel({ status: 'running', done: 3, total: 10 })).toMatch(
            /3\/10/,
        )
        expect(formatClassificationProgressLabel({ status: 'done', done: 10, total: 10 })).toMatch(
            /completo/,
        )
    })

    it('mate_scores is not “wait for background”', () => {
        const m = classificationPendingUserMessage({ reason: 'mate_scores', mateStatus: 'unclear' })
        expect(m.detail).toMatch(/mate/i)
        expect(m.detail).not.toMatch(/background/i)
    })
})

describe('incomplete scores', () => {
    it('missing cp → pending', () => {
        const r = classifyMoveFromEvals({
            bestScore: { playerColor: 'white', kind: 'cp', cp: null, mate: null },
            playedScore: cpScore('white', 0),
        })
        expect(r.engineLabel).toBe('pending')
        expect(r.reason).toBe('incomplete_score')
    })
})
