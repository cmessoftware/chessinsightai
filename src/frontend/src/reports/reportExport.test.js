import { describe, expect, it } from 'vitest'
import { inflateSync } from 'node:zlib'
import { fileForReport, renderReportMarkdown, reportDocument } from './reportExport.js'
import { rankingCharts, rankingParagraphs } from './rankingReport.js'

const ranking = { id: 'RPT-FEAT-03', label: 'Ranking por ritmo', path: '/reports/ranking' }
const precision = { id: 'RPT-FEAT-04', label: 'Precisión por ritmo', path: '/reports/precision' }
const generatedAt = new Date('2026-11-12T19:40:00.000Z')

function textOf(bytes) {
    return new TextDecoder().decode(bytes)
}

function idatBytes(png) {
    const parts = []
    let offset = 8
    while (offset + 8 <= png.length) {
        const length = new DataView(png.buffer, png.byteOffset + offset, 4).getUint32(0)
        const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8))
        if (type === 'IDAT') parts.push(png.subarray(offset + 8, offset + 8 + length))
        offset += 12 + length
        if (type === 'IEND') break
    }
    return Buffer.concat(parts.map((part) => Buffer.from(part)))
}

describe('report export', () => {
    it('writes Markdown with the chosen format and the pending notice', () => {
        const file = fileForReport(precision, 'markdown', generatedAt)
        const text = textOf(file.bytes)
        expect(file.filename).toBe('precision-por-ritmo.md')
        expect(text).toContain('# Precisión por ritmo')
        expect(text).toContain('Formato: Markdown')
        expect(text).toContain('Generado: 2026-11-12 19:40 UTC')
        expect(text).toContain('Este informe todavía no está disponible.')
    })

    it('writes a PDF that records the same choice', () => {
        const file = fileForReport(ranking, 'pdf', generatedAt)
        const text = textOf(file.bytes)
        expect(file.filename).toBe('ranking-por-ritmo.pdf')
        expect(text.startsWith('%PDF-1.4')).toBe(true)
        expect(text).toContain('Ranking por ritmo')
        expect(text).toContain('Formato: PDF')
        expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
    })

    it('keeps Spanish accents inside the PDF bytes', () => {
        const doc = reportDocument(precision, generatedAt)
        const text = new TextDecoder('latin1').decode(fileForReport(precision, 'pdf', generatedAt).bytes)
        expect(renderReportMarkdown(doc, 'PDF')).toContain('Precisión')
        expect(text).toContain('Precisión por ritmo')
    })

    it('puts the ranking chart in the Markdown image and in the PDF', () => {
        const data = {
            from: '2025-11-12',
            to: '2026-11-12',
            rhythms: [
                {
                    label: 'Blitz',
                    speed_class: 'blitz',
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
        const paragraphs = rankingParagraphs(data, 'blitz')
        const charts = rankingCharts(data, 'blitz')
        const file = fileForReport(ranking, 'markdown', generatedAt, paragraphs, charts)
        const markdown = textOf(file.bytes)
        expect(markdown).toContain('mínimo 1400')
        expect(markdown).not.toContain('| Fecha |')
        expect(markdown).toContain('](ranking-por-ritmo.png)')
        const png = file.extras[0].bytes
        expect(file.extras[0].filename).toBe('ranking-por-ritmo.png')
        expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
        expect(inflateSync(idatBytes(png)).length).toBeGreaterThan(1000)

        const pdf = new TextDecoder('latin1').decode(
            fileForReport(ranking, 'pdf', generatedAt, paragraphs, charts).bytes,
        )
        expect(pdf).toContain('Variaci')
        expect(pdf).toContain('10/01/2026')
    })

    it('rejects an unknown format', () => {
        expect(() => fileForReport(ranking, 'html', generatedAt)).toThrow(/Formato no soportado/)
    })
})
