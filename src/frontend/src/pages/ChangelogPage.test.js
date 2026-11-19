import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ChangelogPage from './ChangelogPage.jsx'

vi.mock('../hooks/useAuth.js', () => ({
    useAuth: vi.fn(() => ({ user: null, loading: false, hasPermission: () => false })),
}))

import { useAuth } from '../hooks/useAuth.js'

describe('ChangelogPage', () => {
    it('renders the markdown heading instead of the raw marker', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            loading: false,
            hasPermission: () => false,
        })
        const html = renderToStaticMarkup(createElement(ChangelogPage))
        expect(html).toContain('<h1>Changelog</h1>')
        expect(html).not.toContain('# Changelog')
    })

    it('hides the roadmap checklist link for non-admin viewers', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            loading: false,
            hasPermission: () => false,
        })
        const html = renderToStaticMarkup(createElement(ChangelogPage))
        expect(html).not.toContain('/changelog/pendientes')
    })

    it('shows the roadmap checklist link for admin viewers', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { role: 'admin' },
            loading: false,
            hasPermission: (p) => p === 'admin' || p === 'ALL',
        })
        const html = renderToStaticMarkup(createElement(ChangelogPage))
        expect(html).toContain('href="/changelog/pendientes"')
    })

    it('renders the traceability table and its links', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            loading: false,
            hasPermission: () => false,
        })
        const html = renderToStaticMarkup(createElement(ChangelogPage))
        expect(html).toContain('<table>')
        expect(html).toContain('Fecha de merge (UTC)')
        expect(html).toContain('href="https://keepachangelog.com/en/1.0.0/"')
        expect(html).not.toContain('| Fecha de merge')
    })
})