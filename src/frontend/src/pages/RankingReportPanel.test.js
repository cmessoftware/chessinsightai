import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RankingReportView } from './RankingReportPanel.jsx'

const report = { id: 'RPT-FEAT-03', label: 'Ranking por ritmo', path: '/reports/ranking' }

const data = {
    from: '2025-11-12',
    to: '2026-11-12',
    skipped: 1,
    player: 'ada',
    players: ['Zoe', 'ada'],
    rhythms: [
        {
            speed_class: 'blitz',
            label: 'Blitz',
            games: 2,
            minimum: { rating: 1111, date: '2026-01-10' },
            average: { rating: 1111, date: '2026-01-10' },
            maximum: { rating: 1111, date: '2026-02-01' },
            series: [
                { date: '2026-01-10', rating: 1111 },
                { date: '2026-02-01', rating: 1111 },
            ],
        },
        {
            speed_class: 'rapid',
            label: 'Rapid',
            games: 2,
            minimum: { rating: 1510, date: '2026-03-01' },
            average: { rating: 1610, date: '2026-04-01' },
            maximum: { rating: 1710, date: '2026-05-01' },
            series: [
                { date: '2026-03-01', rating: 1510 },
                { date: '2026-05-01', rating: 1710 },
            ],
        },
    ],
}

describe('RankingReportView', () => {
    it('shows Rapid by default, one scaled chart, and export controls at both ends', () => {
        const html = renderToStaticMarkup(
            createElement(RankingReportView, {
                report,
                data,
                months: 12,
                onMonthsChange: () => {},
                player: 'ada',
                onPlayerChange: () => {},
            }),
        )
        expect(html).toContain('Jugador')
        expect(html).toContain('ada')
        expect(html).toContain('Ritmo')
        expect(html).toContain('1510')
        expect(html).toContain('1710')
        expect(html).not.toContain('1111')
        expect(html).toContain('01/03/2026')
        expect(html).toContain('01/05/2026')
        expect(html).toContain('<title>01/03/2026 · 1510</title>')
        expect(html).toContain('Pasá el mouse sobre un punto')
        expect(html.match(/<polyline /g)).toHaveLength(1)
        expect(html.match(/Generar/g)).toHaveLength(2)
        expect(html).toContain('1 partida quedó fuera')
    })
})
