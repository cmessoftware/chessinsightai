import { describe, expect, it } from 'vitest'
import { chartPoints, rankingParagraphs } from './rankingReport.js'

const data = {
    from: '2025-11-12',
    to: '2026-11-12',
    rhythms: [
        {
            label: 'Blitz',
            games: 2,
            minimum: { rating: 1400, date: '2026-01-10' },
            average: { rating: 1500, date: '2026-08-01' },
            maximum: { rating: 1600, date: '2026-06-01' },
            series: [
                { date: '2026-01-10', rating: 1400 },
                { date: '2026-06-01', rating: 1600 },
            ],
        },
    ],
}

describe('rankingParagraphs', () => {
    it('writes one block per rhythm with the three dates', () => {
        const text = rankingParagraphs(data).join('\n')
        expect(text).toContain('Período: 12/11/2025 a 12/11/2026.')
        expect(text).toContain('Blitz: mínimo 1400 (10/01/2026), promedio 1500 (01/08/2026), máximo 1600 (01/06/2026).')
        expect(text).not.toContain('| Fecha |')
        expect(text).not.toContain(';')
    })

    it('limits the download to the selected rhythm', () => {
        const text = rankingParagraphs(
            {
                ...data,
                player: 'ada',
                rhythms: data.rhythms.map((rhythm) => ({ ...rhythm, speed_class: 'blitz' })),
            },
            'blitz',
        ).join('\n')
        expect(text).toContain('Jugador: ada.')
        expect(text).toContain('Blitz:')
    })

    it('places the chart from the first date to the last', () => {
        const points = chartPoints(data.rhythms[0].series)
        expect(points[0].x).toBeLessThan(points[1].x)
        expect(points[0].y).toBeGreaterThan(points[1].y)
    })
})
