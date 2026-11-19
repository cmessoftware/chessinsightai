/** Párrafo de cabecera del changelog con enlace al checklist (solo admins en UI). */
const ADMIN_ROADMAP_HEADER_RE = /\r?\n\*\*Roadmap pendiente[^\n]*\r?\n\r?\n/

export function isChangelogAdmin(user, hasPermission) {
    if (!user) return false
    if (typeof hasPermission === 'function') {
        if (hasPermission('admin') || hasPermission('ALL')) return true
    }
    return Boolean(
        user.role === 'admin' ||
            user.roles?.includes('admin') ||
            user.permissions?.includes('ALL'),
    )
}

/**
 * @param {string} rawChangelog
 * @param {{ showAdminRoadmapLink?: boolean }} [options]
 */
export function changelogMarkdownForViewer(rawChangelog, options = {}) {
    const show = Boolean(options.showAdminRoadmapLink)
    if (show) return rawChangelog
    return String(rawChangelog).replace(ADMIN_ROADMAP_HEADER_RE, '')
}