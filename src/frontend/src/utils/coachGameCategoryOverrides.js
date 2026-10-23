import { notifyCoachPartidasCategoriesChanged } from './coachPartidasCategoriesSync.js'

export const COACH_GAME_CATEGORY_OVERRIDES_STORAGE_KEY = 'coach.partidas.categoryOverrides.v1'

/** @returns {Record<string, string>} */
export function loadCoachGameCategoryOverrides() {
    if (typeof localStorage === 'undefined') return {}
    try {
        const raw = localStorage.getItem(COACH_GAME_CATEGORY_OVERRIDES_STORAGE_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
        /** @type {Record<string, string>} */
        const out = {}
        for (const [gameId, categoryId] of Object.entries(parsed)) {
            const gid = String(gameId || '').trim()
            const cid = String(categoryId || '').trim()
            if (gid && cid) out[gid] = cid
        }
        return out
    } catch {
        return {}
    }
}

/** @param {Record<string, string>} overrides */
export function saveCoachGameCategoryOverrides(overrides) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(COACH_GAME_CATEGORY_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides))
}

/**
 * @param {string} gameId
 * @param {string | null | undefined} categoryId — null/empty clears override
 * @param {Record<string, string>} [current]
 */
export function setCoachGameCategoryOverride(gameId, categoryId, current) {
    const gid = String(gameId || '').trim()
    if (!gid) return current || {}
    const next = { ...(current || loadCoachGameCategoryOverrides()) }
    const cid = String(categoryId || '').trim()
    if (cid) next[gid] = cid
    else delete next[gid]
    saveCoachGameCategoryOverrides(next)
    notifyCoachPartidasCategoriesChanged()
    return next
}

/**
 * @param {string[]} gameIds
 * @param {string | null | undefined} categoryId
 * @param {Record<string, string>} [current]
 */
export function setCoachGameCategoryOverridesBulk(gameIds, categoryId, current) {
    const next = { ...(current || loadCoachGameCategoryOverrides()) }
    const cid = String(categoryId || '').trim()
    for (const id of gameIds || []) {
        const gid = String(id || '').trim()
        if (!gid) continue
        if (cid) next[gid] = cid
        else delete next[gid]
    }
    saveCoachGameCategoryOverrides(next)
    notifyCoachPartidasCategoriesChanged()
    return next
}
