import { describe, expect, it } from 'vitest'
import {
    formatStandardEval,
    mateScoreToChartCp,
    playerScoreToChartCp,
    toWhiteStandardScore,
} from './engineEval.js'

describe('engineEval standard white POV', () => {
    it('keeps white scores unchanged', () => {
        expect(toWhiteStandardScore({ playerColor: 'white', kind: 'cp', cp: 40, mate: null }).cp).toBe(
            40,
        )
        expect(formatStandardEval({ playerColor: 'white', kind: 'cp', cp: 40, mate: null })).toBe(
            '+0.40',
        )
    })

    it('flips black POV to Lichess-style', () => {
        expect(
            formatStandardEval({ playerColor: 'black', kind: 'cp', cp: 342, mate: null }),
        ).toBe('-3.42')
    })

    it('mate scores map to winning chart band not zero', () => {
        expect(mateScoreToChartCp(1)).toBe(2000)
        expect(mateScoreToChartCp(-1)).toBe(-2000)
        expect(Math.abs(mateScoreToChartCp(3))).toBeGreaterThan(1900)
        expect(playerScoreToChartCp({ playerColor: 'white', kind: 'mate', mate: 2, cp: null })).toBe(
            1960,
        )
    })

    it('clamps cp eval to ±2000 for chart', () => {
        expect(
            playerScoreToChartCp({ playerColor: 'white', kind: 'cp', cp: 2500, mate: null }),
        ).toBe(2000)
    })
})
