import { describe, expect, it } from 'vitest'
import {
    advanceMoveNumForVariationStep,
    buildLabelTooltip,
    isErrorEngineLabel,
    nagSuffixForClassification,
    tokenizeVariationChain,
} from './coachPgnDisplay.js'

describe('variation move numbering', () => {
    it('white+black share full move number in variation chain', () => {
        const w = { color: 'w', san: 'Nb3' }
        const b = { color: 'b', san: 'Bb6' }
        expect(tokenizeVariationChain([w, b], 12).map((t) => t.prefix)).toEqual(['12.', '12...'])
        let n = 11
        n = advanceMoveNumForVariationStep({ color: 'b', san: 'Bc5' }, n, w)
        expect(n).toBe(12)
        n = advanceMoveNumForVariationStep(w, n, b)
        expect(n).toBe(12)
        n = advanceMoveNumForVariationStep(b, n, undefined)
        expect(n).toBe(13)
    })
})

describe('coachPgnDisplay CA-3', () => {
    it('nag suffix for errors only', () => {
        expect(nagSuffixForClassification({ engineLabel: 'good' })).toBe('')
        expect(nagSuffixForClassification({ engineLabel: 'inaccuracy' })).toBe('?!')
        expect(nagSuffixForClassification({ engineLabel: 'blunder' })).toBe('??')
    })

    it('label tooltip with PV', () => {
        const t = buildLabelTooltip({
            engineLabel: 'blunder',
            bestPvSan: ['Qd8', 'Nf3'],
        })
        expect(t).toContain('Error grave')
        expect(t).toContain('Mejor: Qd8 Nf3')
    })

    it('label tooltip includes pedagogical impact v1', () => {
        const t = buildLabelTooltip({
            engineLabel: 'blunder',
            pedagogicalImpactMessage: 'Impacto: ventaja decisiva conservada',
            thresholdHint: 'Umbrales v1 (Elo ≥2400): decisivo ≥ +2.0',
        })
        expect(t).toContain('ventaja decisiva conservada')
        expect(t).toContain('Umbrales v1')
    })

    it('good is not error label', () => {
        expect(isErrorEngineLabel('good')).toBe(false)
        expect(nagSuffixForClassification({ engineLabel: 'good' })).toBe('')
    })
})
