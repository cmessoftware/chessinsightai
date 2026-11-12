import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ChangelogPage from './ChangelogPage.jsx'

describe('ChangelogPage', () => {
    const html = renderToStaticMarkup(createElement(ChangelogPage))

    it('renders the markdown heading instead of the raw marker', () => {
        expect(html).toContain('<h1>Changelog</h1>')
        expect(html).not.toContain('# Changelog')
    })

    it('renders the traceability table and its links', () => {
        expect(html).toContain('<table>')
        expect(html).toContain('Fecha de merge (UTC)')
        expect(html).toContain('href="https://keepachangelog.com/en/1.0.0/"')
        expect(html).not.toContain('| Fecha de merge')
    })
})
