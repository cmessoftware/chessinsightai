import { describe, expect, it } from 'vitest'
import {
    buildLabelTooltip,
    isErrorEngineLabel,
    nagSuffixForClassification,
} from './coachPgnDisplay.js'

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
