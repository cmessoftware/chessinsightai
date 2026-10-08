/**
 * CA-7 — Caché de clasificación por partida (sesión + sessionStorage).
 * Solo línea principal; variantes no invalidan entradas ya calculadas.
 */

import { collectMainLinePlies } from './coachPlyClassification.js'

export const CLASSIFICATION_CACHE_VERSION = 1
const STORAGE_PREFIX = 'chessinsight.coach.classification.v1'

/**
 * Firma estable de la línea principal (solo children[0]).
 * @param {object | null | undefined} root
 * @returns {string}
 */
export function mainLineSignature(root) {
    if (!root?.fen) return ''
    return collectMainLinePlies(root)
        .map((j) => `${j.pathKey}:${j.playedUci}`)
        .join('|')
}

/**
 * @param {string | null | undefined} gameId
 * @returns {string | null}
 */
function storageKey(gameId) {
    if (!gameId) return null
    return `${STORAGE_PREFIX}:${gameId}`
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {boolean}
 */
export function isClassificationCacheable(row) {
    if (!row?.pathKey) return false
    if (row.engineLabel === 'pending' && row.reason !== 'mate_scores') return false
    return row.engineLabel != null
}

/**
 * @param {{
 *   gameId?: string | null,
 *   depth: number,
 *   multipv: number,
 *   mainLineSignature: string,
 *   eloKey?: string,
 *   persist?: boolean,
 * }} meta
 * @returns {{ byPathKey: Record<string, object>, meta: object } | null}
 */
export function loadClassificationSessionCache({
    gameId,
    depth,
    multipv,
    mainLineSignature: signature,
    eloKey = '',
}) {
    const key = storageKey(gameId)
    if (!key || typeof sessionStorage === 'undefined') return null
    try {
        const raw = sessionStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (parsed.version !== CLASSIFICATION_CACHE_VERSION) return null
        if (parsed.depth !== depth || parsed.multipv !== multipv) return null
        if (parsed.mainLineSignature !== signature) return null
        if (parsed.eloKey !== eloKey) return null
        return {
            byPathKey: parsed.byPathKey || {},
            meta: parsed,
        }
    } catch {
        return null
    }
}

/**
 * @param {{
 *   gameId?: string | null,
 *   depth: number,
 *   multipv: number,
 *   mainLineSignature: string,
 *   eloKey?: string,
 *   byPathKey: Record<string, object>,
 *   persist?: boolean,
 * }} input
 */
export function saveClassificationSessionCache({
    gameId,
    depth,
    multipv,
    mainLineSignature: signature,
    eloKey = '',
    byPathKey,
    persist = true,
}) {
    if (!persist) return
    const key = storageKey(gameId)
    if (!key || typeof sessionStorage === 'undefined') return

    const pruned = {}
    for (const [pathKey, row] of Object.entries(byPathKey || {})) {
        if (isClassificationCacheable(row)) pruned[pathKey] = row
    }

    try {
        sessionStorage.setItem(
            key,
            JSON.stringify({
                version: CLASSIFICATION_CACHE_VERSION,
                depth,
                multipv,
                mainLineSignature: signature,
                eloKey,
                savedAt: Date.now(),
                byPathKey: pruned,
            }),
        )
    } catch {
        /* quota / private mode */
    }
}

/**
 * Mantiene solo entradas cuya pathKey sigue en la línea principal actual.
 * @param {Record<string, object>} byPathKey
 * @param {Set<string>} validPathKeys
 */
export function pruneClassificationCache(byPathKey, validPathKeys) {
    const next = {}
    for (const pk of validPathKeys) {
        if (byPathKey[pk]) next[pk] = byPathKey[pk]
    }
    return next
}

export function clearClassificationSessionCache(gameId) {
    const key = storageKey(gameId)
    if (!key || typeof sessionStorage === 'undefined') return
    try {
        sessionStorage.removeItem(key)
    } catch {
        /* ignore */
    }
}
