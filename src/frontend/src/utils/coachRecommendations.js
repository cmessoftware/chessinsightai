/**
 * CA-6 — Recomendaciones estáticas por Elo y engine_label (spec §9).
 */

import templates from '../../public/config/recommendation_templates.v1.json'

/** @typedef {'inaccuracy' | 'mistake' | 'blunder'} ErrorEngineLabel */

/**
 * @param {number | null | undefined} playerElo
 * @returns {string}
 */
export function resolveEloBandId(playerElo) {
    const elo = playerElo != null && playerElo > 0 ? playerElo : null
    if (elo == null) return '1600-1999'
    for (const band of templates.eloBands) {
        if (band.maxElo == null || elo <= band.maxElo) return band.id
    }
    return 'gte2400'
}

/**
 * @param {number | null | undefined} playerElo
 * @returns {string}
 */
export function eloBandLabel(playerElo) {
    const elo = playerElo != null && playerElo > 0 ? playerElo : null
    if (elo == null) return templates.basicFallbackBand
    const band = templates.eloBands.find((b) => b.maxElo == null || elo <= b.maxElo)
    return band?.label ?? templates.basicFallbackBand
}

/**
 * @param {{
 *   engineLabel?: string | null,
 *   playerElo?: number | null,
 * }} input
 * @returns {{ text: string, mode: 'elo' | 'basic', bandLabel: string }}
 */
export function lookupRecommendationTemplate({ engineLabel, playerElo }) {
    const bandLabel = eloBandLabel(playerElo)
    const hasElo = playerElo != null && playerElo > 0

    if (!engineLabel || !['inaccuracy', 'mistake', 'blunder'].includes(engineLabel)) {
        return { text: '', mode: hasElo ? 'elo' : 'basic', bandLabel }
    }

    if (!hasElo) {
        return {
            text: templates.basicNoElo,
            mode: 'basic',
            bandLabel: 'sin Elo',
        }
    }

    const bandId = resolveEloBandId(playerElo)
    const byLabel = templates.byEngineLabel[engineLabel]
    const text = byLabel?.[bandId] || templates.basicNoElo
    return { text, mode: 'elo', bandLabel }
}

export const RECOMMENDATION_TEMPLATES_VERSION = templates.version
