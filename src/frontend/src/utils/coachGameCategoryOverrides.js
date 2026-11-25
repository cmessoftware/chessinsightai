import { notifyCoachPartidasCategoriesChanged } from './coachPartidasCategoriesSync.js'

export const COACH_GAME_CATEGORY_OVERRIDES_STORAGE_KEY_V1 = 'coach.partidas.categoryOverrides.v1'
export const COACH_GAME_CATEGORY_OVERRIDES_STORAGE_KEY = 'coach.partidas.categoryOverrides.v2'

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeOverrideValue(raw) {
    if (Array.isArray(raw)) {
        return [...new Set(raw.map((c) => String(c || '').trim()).filter(Boolean))]
    }
    const single = String(raw || '').trim()
    return single ? [single] : []
}

/**
 * @param {unknown} parsed
 * @returns {Record<string, string[]>}
 */
function normalizeOverridesMap(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    /** @type {Record<string, string[]>} */
    const out = {}
    for (const [gameId, value] of Object.entries(parsed)) {
        const gid = String(gameId || '').trim()
        const ids = normalizeOverrideValue(value)
        if (gid && ids.length) out[gid] = ids
    }
    return out
}

/** @param {Record<string, string[]>} overrides */
export function saveCoachGameCategoryOverrides(overrides) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(COACH_GAME_CATEGORY_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides))
}

/** @returns {Record<string, string[]>} */
export function loadCoachGameCategoryOverrides() {
    if (typeof localStorage === 'undefined') return {}
    try {
        const rawV2 = localStorage.getItem(COACH_GAME_CATEGORY_OVERRIDES_STORAGE_KEY)
        if (rawV2) {
            const out = normalizeOverridesMap(JSON.parse(rawV2))
            return out
        }
        const rawV1 = localStorage.getItem(COACH_GAME_CATEGORY_OVERRIDES_STORAGE_KEY_V1)
        if (!rawV1) return {}
        const migrated = normalizeOverridesMap(JSON.parse(rawV1))
        if (Object.keys(migrated).length) {
            saveCoachGameCategoryOverrides(migrated)
        }
        return migrated
    } catch {
        return {}
    }
}

/**
 * @param {Record<string, string[]> | Record<string, string> | null | undefined} overrides
 * @param {string | number | null | undefined} gameId
 * @returns {string[]}
 */
export function getCoachGameCategoryOverrideIds(overrides, gameId) {
    const gid = gameId != null ? String(gameId).trim() : ''
    if (!gid || !overrides) return []
    return normalizeOverrideValue(overrides[gid])
}

/**
 * @param {string} gameId
 * @param {string | null | undefined} categoryId — null/empty clears override
 * @param {Record<string, string[]>} [current]
 */
export function setCoachGameCategoryOverride(gameId, categoryId, current) {
    const gid = String(gameId || '').trim()
    if (!gid) return current || {}
    const next = { ...(current || loadCoachGameCategoryOverrides()) }
    const cid = String(categoryId || '').trim()
    if (cid) next[gid] = [cid]
    else delete next[gid]
    saveCoachGameCategoryOverrides(next)
    notifyCoachPartidasCategoriesChanged()
    return next
}

/**
 * @param {string[]} gameIds
 * @param {string | null | undefined} categoryId — replaces manual tags per game
 * @param {Record<string, string[]>} [current]
 */
export function setCoachGameCategoryOverridesBulk(gameIds, categoryId, current) {
    const next = { ...(current || loadCoachGameCategoryOverrides()) }
    const cid = String(categoryId || '').trim()
    for (const id of gameIds || []) {
        const gid = String(id || '').trim()
        if (!gid) continue
        if (cid) next[gid] = [cid]
        else delete next[gid]
    }
    saveCoachGameCategoryOverrides(next)
    notifyCoachPartidasCategoriesChanged()
    return next
}

/**
 * Adds category tags without removing existing manual tags (e.g. on import).
 * @param {string[]} gameIds
 * @param {string[]} categoryIds
 * @param {Record<string, string[]>} [current]
 */
export function mergeCoachGameCategoryOverridesBulk(gameIds, categoryIds, current) {
    const next = { ...(current || loadCoachGameCategoryOverrides()) }
    const addIds = [...new Set((categoryIds || []).map((c) => String(c || '').trim()).filter(Boolean))]
    if (!addIds.length) return next
    let changed = false
    for (const id of gameIds || []) {
        const gid = String(id || '').trim()
        if (!gid) continue
        const prev = next[gid] || []
        const merged = [...new Set([...prev, ...addIds])]
        if (merged.length !== prev.length || merged.some((x, i) => x !== prev[i])) {
            next[gid] = merged
            changed = true
        }
    }
    if (changed) {
        saveCoachGameCategoryOverrides(next)
        notifyCoachPartidasCategoriesChanged()
    }
    return next
}

/**
 * @param {Array<string | number>} gameIds
 * @param {string[]} categoryIds
 */
export function applyCoachImportCategoryTags(gameIds, categoryIds) {
    const ids = (categoryIds || []).map((c) => String(c || '').trim()).filter(Boolean)
    if (!ids.length || !gameIds?.length) return
    mergeCoachGameCategoryOverridesBulk(
        gameIds.map((id) => String(id)),
        ids,
    )
}