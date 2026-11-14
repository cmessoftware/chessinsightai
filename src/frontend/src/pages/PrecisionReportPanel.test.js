import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PrecisionReportView } from './PrecisionReportPanel.jsx'

const report = { id: 'RPT-FEAT-04', label: 'Precisión por ritmo', path: '/reports/precision' }

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
            precision_general: { mean: 11.1, n: 2 },
            precision_apertura: { mean: 11.1, n: 2 },
            precision_medio_juego: { mean: 11.1, n: 2 },
            precision_final: { mean: 11.1, n: 2 },
            series: [
                { date: '2026-01-10', rating: 11.1 },
                { date: '2026-02-01', rating: 11.1 },
            ],
        },
        {
            speed_class: 'rapid',
            label: 'Rapid',
            games: 2,
            precision_general: { mean: 72.4, n: 2 },
            precision_apertura: { mean: 80, n: 2 },
            precision_medio_juego: { mean: 70, n: 2 },
            precision_final: { mean: 60, n: 2 },
            series: [
                { date: '2026-03-01', rating: 70 },
                { date: '2026-05-01', rating: 74.8 },
            ],
        },
    ],
}

describe('PrecisionReportView', () => {
    it('shows Rapid by default, the four precisions, and one chart', () => {
        const html = renderToStaticMarkup(
            createElement(PrecisionReportView, {
                report,
                data,
                months: 12,
                onMonthsChange: () => {},
                player: 'ada',
                onPlayerChange: () => {},
            }),
        )
        expect(html).toContain('Jugador')
        expect(html).toContain('72.4%')
        expect(html).toContain('80.0%')
        expect(html).toContain('70.0%')
        expect(html).toContain('60.0%')
        expect(html).not.toContain('11.1%')
        expect(html).toContain('<title>01/03/2026 · 70.0%</title>')
        expect(html).toContain('Pasá el mouse sobre un punto para ver la fecha y la precisión.')
        expect(html.match(/<polyline /g)).toHaveLength(1)
        expect(html.match(/Generar/g)).toHaveLength(2)
        expect(html).toContain('1 partida quedó fuera')
        expect(html).not.toContain('Calcular precisión')
    })

    it('offers an async calculation when games in the period have no precision', () => {
        const html = renderToStaticMarkup(
            createElement(PrecisionReportView, {
                report,
                data: { ...data, pending: 3, rhythms: [] },
                months: 12,
                onMonthsChange: () => {},
                player: 'ada',
                onPlayerChange: () => {},
                onCalculate: () => {},
                calculating: false,
                notice: 'El cálculo sigue en segundo plano. El aviso aparece en las notificaciones.',
                noticeTone: 'ok',
            }),
        )
        expect(html).toContain('Hay 3 partidas sin precisión en este período.')
        expect(html).toContain('Calcular precisión')
        expect(html).toContain('El aviso aparece en las notificaciones.')
        expect(html).toContain('color:#1b7a32')
        expect(html).toContain('font-size:1.5rem')
    })
})
