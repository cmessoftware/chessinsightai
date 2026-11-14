import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RivalReportView } from './RivalReportPanel.jsx'
import { rivalParagraphs } from '../reports/rivalReport.js'

const report = { id: 'RPT-FEAT-05', label: 'Comparación con un rival', path: '/reports/rival' }

const data = {
    from: '2025-11-12',
    to: '2026-11-12',
    player: 'Ada',
    players: ['Ada'],
    rival: 'Bob',
    rivals: ['Bob', 'Zoe'],
    rhythms: [
        {
            speed_class: 'blitz',
            label: 'Blitz',
            ranking: {
                games: 1,
                minimum: { rating: 1111, date: '2026-01-10' },
                average: { rating: 1111, date: '2026-01-10' },
                maximum: { rating: 1111, date: '2026-01-10' },
                series: [{ date: '2026-01-10', rating: 1111 }],
            },
            precision: null,
        },
        {
            speed_class: 'rapid',
            label: 'Rapid',
            ranking: {
                games: 2,
                minimum: { rating: 1700, date: '2026-03-01' },
                average: { rating: 1750, date: '2026-04-01' },
                maximum: { rating: 1800, date: '2026-05-01' },
                series: [
                    { date: '2026-03-01', rating: 1700 },
                    { date: '2026-05-01', rating: 1800 },
                ],
                mine_series: [
                    { date: '2026-03-01', rating: 1500 },
                    { date: '2026-05-01', rating: 1600 },
                ],
                rival_series: [
                    { date: '2026-03-01', rating: 1700 },
                    { date: '2026-05-01', rating: 1800 },
                ],
            },
            precision: {
                games: 2,
                precision_general: { mean: 88, n: 2 },
                precision_apertura: { mean: 80, n: 2 },
                precision_medio_juego: { mean: 70, n: 2 },
                precision_final: { mean: 60, n: 2 },
                series: [
                    { date: '2026-03-01', rating: 86 },
                    { date: '2026-05-01', rating: 90 },
                ],
                mine_series: [
                    { date: '2026-03-01', rating: 75 },
                    { date: '2026-05-01', rating: 78 },
                ],
                rival_series: [
                    { date: '2026-03-01', rating: 86 },
                    { date: '2026-05-01', rating: 90 },
                ],
            },
        },
    ],
}

describe('RivalReportView', () => {
    it('shows the rival rating and precision for Rapid, not the other rhythm', () => {
        const html = renderToStaticMarkup(
            createElement(RivalReportView, {
                report,
                data,
                months: 12,
                onMonthsChange: () => {},
                player: 'Ada',
                onPlayerChange: () => {},
                rival: 'Bob',
                onRivalChange: () => {},
            }),
        )
        expect(html).toContain('Rival')
        expect(html).toContain('Bob contra Ada')
        expect(html).toContain('1700')
        expect(html).toContain('88.0%')
        expect(html).not.toContain('1111')
        expect(html).toContain('stroke="#1565c0"')
        expect(html).toContain('stroke="#d32f2f"')
        expect(html).toContain('<title>Ada · 01/03/2026 · 1500</title>')
        expect(html).toContain('<title>Bob · 01/03/2026 · 1700</title>')
        expect(html.match(/Generar/g)).toHaveLength(2)
        expect(rivalParagraphs(data, 'rapid').join(' ')).toContain('solo en las partidas contra Ada')
    })
})
