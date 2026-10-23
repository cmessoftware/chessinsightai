import { describe, expect, it } from 'vitest'
import { formatStandardEval, toWhiteStandardScore } from './engineEval.js'

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
})
