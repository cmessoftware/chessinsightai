import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ReportsModulePage from './ReportsModulePage.jsx'

function htmlAt(path) {
    return renderToStaticMarkup(
        createElement(MemoryRouter, { initialEntries: [path] }, createElement(ReportsModulePage)),
    )
}

describe('ReportsModulePage', () => {
    it('lists every report from the module menu', () => {
        const html = htmlAt('/reports')
        expect(html).toContain('Módulo de Reportes')
        expect(html).toContain('href="/reports/ranking"')
        expect(html).toContain('Comparación con un rival')
        expect(html).toContain('Sesgo de supervivencia')
    })

    it('loads the ranking report on its own page', () => {
        const html = htmlAt('/reports/ranking')
        expect(html).toContain('Ranking por ritmo')
        expect(html).toContain('Cargando el ranking')
        expect(html).not.toContain('Este informe todavía no está disponible.')
    })

    it('loads the precision report on its own page', () => {
        const html = htmlAt('/reports/precision')
        expect(html).toContain('Precisión por ritmo')
        expect(html).toContain('Cargando la precisión')
        expect(html).not.toContain('Este informe todavía no está disponible.')
    })

    it('lets the user choose Markdown or PDF before generating', () => {
        const html = htmlAt('/reports/rival')
        expect(html).toContain('Comparación con un rival')
        expect(html).toContain('Este informe todavía no está disponible.')
        expect(html).toContain('Formato')
        expect(html).toContain('Markdown')
        expect(html).toContain('PDF')
        expect(html).toContain('Generar')
    })
})
