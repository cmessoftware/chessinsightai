import { describe, expect, it } from 'vitest'
import { precisionCharts, precisionParagraphs } from './precisionReport.js'

const data = {
    from: '2025-11-12',
    to: '2026-11-12',
    player: 'Ada',
    rhythms: [
        {
            speed_class: 'rapid',
            label: 'Rapid',
            games: 2,
            precision_general: { mean: 72.4, n: 2 },
            precision_apertura: { mean: 80, n: 1 },
            precision_medio_juego: { mean: null, n: 0 },
            precision_final: { mean: 60, n: 2 },
            series: [
                { date: '2026-03-01', rating: 70 },
                { date: '2026-05-01', rating: 74.8 },
            ],
        },
    ],
}

describe('precision report text', () => {
    it('writes the four chess_statistics means and a chart of the general precision', () => {
        const lines = precisionParagraphs(data, 'rapid')
        expect(lines.join(' ')).toContain('Jugador: Ada.')
        expect(lines.join(' ')).toContain('precisión 72.4% (2)')
        expect(lines.join(' ')).toContain('apertura 80.0% (1)')
        expect(lines.join(' ')).toContain('medio juego sin datos')
        expect(lines.join(' ')).toContain('final 60.0% (2)')
        const charts = precisionCharts(data, 'rapid')
        expect(charts).toHaveLength(1)
        expect(charts[0].title).toBe('Precisión de Rapid')
        expect(charts[0].valueLabel).toBe('Precisión')
        expect(charts[0].series[0].rating).toBe(70)
    })

    it('says when the selected rhythm has no games', () => {
        expect(precisionParagraphs(data, 'blitz').join(' ')).toContain('No hay partidas con precisión')
        expect(precisionCharts(data, 'blitz')).toEqual([])
    })
})
