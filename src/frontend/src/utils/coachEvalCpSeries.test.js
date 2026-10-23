import { describe, expect, it } from 'vitest'
import {
    buildMainLineEvalCpSeries,
    computeChartCpSpan,
    cpToChartNormalizedY,
    mainLinePathForPly,
    selectMoveNumberAxisTicks,
} from './coachEvalCpSeries.js'

describe('coachEvalCpSeries', () => {
    it('computeChartCpSpan is fixed at 2000 cp', () => {
        expect(computeChartCpSpan([{ cp: 40 }, { cp: -30 }])).toBe(2000)
        expect(computeChartCpSpan([{ cp: -149 }, { cp: -690 }])).toBe(2000)
    })

    it('cpToChartNormalizedY (asinh) spreads midgame and soft-limits extremes', () => {
        expect(cpToChartNormalizedY(0)).toBe(0)
        expect(Math.abs(cpToChartNormalizedY(120))).toBeGreaterThan(0.22)
        expect(Math.abs(cpToChartNormalizedY(120))).toBeLessThan(Math.abs(cpToChartNormalizedY(-2000)))
        expect(Math.abs(cpToChartNormalizedY(2000))).toBeGreaterThan(0.98)
    })

    it('builds series along main line', () => {
        const root = {
            fen: 'start',
            children: [
                {
                    uci: 'e2e4',
                    san: 'e4',
                    fen: 'after1',
                    children: [],
                },
            ],
        }
        const series = buildMainLineEvalCpSeries(root, {
            start: { cp: 20 },
            after1: { cp: -30 },
        })
        expect(series).toHaveLength(2)
        expect(series[0].cp).toBe(20)
        expect(series[1].cp).toBe(-30)
        expect(series[1].path).toEqual([0])
        expect(series[1].moveNumber).toBe(1)
    })

    it('mainLinePathForPly is all zeros', () => {
        expect(mainLinePathForPly(3)).toEqual([0, 0, 0])
    })

    it('selectMoveNumberAxisTicks dedupes move numbers', () => {
        const series = [
            { moveNumber: 0 },
            { moveNumber: 1 },
            { moveNumber: 1 },
            { moveNumber: 2 },
        ]
        expect(selectMoveNumberAxisTicks(series)).toEqual([
            { index: 1, moveNumber: 1 },
            { index: 3, moveNumber: 2 },
        ])
    })
})
