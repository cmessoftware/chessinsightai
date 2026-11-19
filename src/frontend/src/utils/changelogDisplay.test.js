import { describe, expect, it } from 'vitest'
import changelogText from '../../../../CHANGELOG.md?raw'
import { changelogMarkdownForViewer, isChangelogAdmin } from './changelogDisplay.js'

describe('changelogMarkdownForViewer', () => {
    it('hides the admin roadmap header for public viewers', () => {
        const md = changelogMarkdownForViewer(changelogText, { showAdminRoadmapLink: false })
        expect(md).not.toContain('/changelog/pendientes')
        expect(md).not.toMatch(/\*\*Roadmap pendiente/)
        expect(md).toContain('# Changelog')
    })

    it('keeps the admin roadmap header for admins', () => {
        const md = changelogMarkdownForViewer(changelogText, { showAdminRoadmapLink: true })
        expect(md).toContain('/changelog/pendientes')
        expect(md).toContain('Roadmap pendiente')
    })
})

describe('isChangelogAdmin', () => {
    it('detects admin role and permissions', () => {
        expect(isChangelogAdmin({ role: 'admin' }, () => false)).toBe(true)
        expect(isChangelogAdmin({ roles: ['coach'] }, (p) => p === 'ALL')).toBe(true)
        expect(isChangelogAdmin({ username: 'x' }, () => false)).toBe(false)
        expect(isChangelogAdmin(null, () => true)).toBe(false)
    })
})