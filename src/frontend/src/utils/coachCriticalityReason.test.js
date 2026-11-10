import { describe, expect, it } from 'vitest'
import {
    COACH_CRITICALITY_REFERENCE,
    criticalitySummary,
    formatCriticalityReason,
} from './coachCriticalityReason.js'

describe('COACH_CRITICALITY_REFERENCE', () => {
    it('keeps the score rule and the four motives', () => {
        const text = COACH_CRITICALITY_REFERENCE.map((item) => item.body).join(' ')
        expect(text).toContain('3 o más')
        expect(text).toContain('150 cp')
        expect(text).toContain('pieza colgada')
        expect(text).toContain('Ruptura o captura de peón')
        expect(text).toContain('cruza la mitad')
        expect(text).toContain('MultiPV')
    })
})

describe('formatCriticalityReason', () => {
    it('explains an evaluation drop in centipawns', () => {
        expect(
            formatCriticalityReason({
                type: 'EVALUATION_DROP',
                description: 'eval_loss 485 cp ≥ 150 cp',
            }),
        ).toBe('Caída de evaluación: 485 cp, umbral 150')
    })

    it('translates a pawn break and an irreversible pawn', () => {
        expect(
            formatCriticalityReason({
                type: 'POSITION_TRANSFORMATION',
                description: 'PAWN_BREAK',
            }),
        ).toBe('Cambio de carácter: ruptura o captura de peón')
        expect(
            formatCriticalityReason({
                type: 'IRREVERSIBLE_DECISION',
                description: 'IRREVERSIBLE_PAWN',
            }),
        ).toBe('Decisión irreversible: el peón cruza la mitad')
    })
})

describe('criticalitySummary', () => {
    it('joins the score, the level and the stored reasons', () => {
        expect(
            criticalitySummary({
                criticality: 6,
                review_pack: {
                    criticality: {
                        score: 6,
                        level: 'Critical',
                        reasons: [
                            { type: 'POSITION_TRANSFORMATION', description: 'PAWN_BREAK' },
                            { type: 'IRREVERSIBLE_DECISION', description: 'IRREVERSIBLE_PAWN' },
                        ],
                    },
                },
            }),
        ).toBe(
            'Puntaje 6.0 · Crítica. Cambio de carácter: ruptura o captura de peón · Decisión irreversible: el peón cruza la mitad',
        )
    })
})
