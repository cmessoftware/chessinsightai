import { pathKeyFromPath } from './coachPlyClassification.js'

export const COACH_PLY_USER_ANNOTATIONS_STORAGE_KEY = 'coach.study.plyUserAnnotations.v1'

/** Etiquetas PGN manuales (FEAT-061). */
export const PLY_USER_NAG_OPTIONS = Object.freeze([
    { value: '', label: 'Sin etiqueta' },
    { value: '!', label: 'Buena (!)' },
    { value: '?', label: 'Mala (?)' },
    { value: '!!', label: 'Brillante (!!)' },
    { value: '??', label: 'Error grave (??)' },
    { value: '!?', label: 'Interesante (!?)' },
    { value: '?!', label: 'Dudosa (?!)' },
    { value: '+-', label: 'Ventaja blancas (+-)' },
    { value: '-+', label: 'Ventaja negras (-+)' },
    { value: '==', label: 'Igualdad (==)' },
])

const VALID_NAG = new Set(PLY_USER_NAG_OPTIONS.map((o) => o.value))

/** @param {string | null | undefined} nag */
export function isValidPlyUserNag(nag) {
    if (nag == null || nag === '') return true
    return VALID_NAG.has(nag)
}

/** @returns {Record<string, Record<string, { comment?: string, nag?: string }>>} */
export function loadAllPlyUserAnnotationsStore() {
    if (typeof localStorage === 'undefined') return {}
    try {
        const raw = localStorage.getItem(COACH_PLY_USER_ANNOTATIONS_STORAGE_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
        return parsed
    } catch {
        return {}
    }
}

/** @param {Record<string, Record<string, { comment?: string, nag?: string }>>} store */
export function saveAllPlyUserAnnotationsStore(store) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(COACH_PLY_USER_ANNOTATIONS_STORAGE_KEY, JSON.stringify(store))
}

/** @returns {Record<string, { comment?: string, nag?: string }>} */
export function loadPlyUserAnnotationsForScope(scopeKey) {
    const key = String(scopeKey || '').trim()
    if (!key) return {}
    const store = loadAllPlyUserAnnotationsStore()
    const block = store[key]
    if (!block || typeof block !== 'object') return {}
    return { ...block }
}

/** @param {Record<string, { comment?: string, nag?: string }>} byPathKey */
export function savePlyUserAnnotationsForScope(scopeKey, byPathKey) {
    const key = String(scopeKey || '').trim()
    if (!key) return
    const store = loadAllPlyUserAnnotationsStore()
    const cleaned = {}
    for (const [pathKey, row] of Object.entries(byPathKey || {})) {
        if (!pathKey || pathKey === 'root') continue
        const comment = typeof row?.comment === 'string' ? row.comment.trim() : ''
        const nag = isValidPlyUserNag(row?.nag) ? row.nag || '' : ''
        if (!comment && !nag) continue
        /** @type {{ comment?: string, nag?: string }} */
        const entry = {}
        if (nag) entry.nag = nag
        if (comment) entry.comment = comment
        cleaned[pathKey] = entry
    }
    if (Object.keys(cleaned).length === 0) {
        delete store[key]
    } else {
        store[key] = cleaned
    }
    saveAllPlyUserAnnotationsStore(store)
}

/**
 * @param {Record<string, { comment?: string, nag?: string }>} byPathKey
 * @param {number[]} path
 * @param {{ comment?: string | null, nag?: string | null }} patch
 */
export function applyPlyUserAnnotationPatch(byPathKey, path, patch) {
    const pathKey = pathKeyFromPath(path)
    if (!path?.length) return byPathKey || {}

    const next = { ...(byPathKey || {}) }
    const prev = next[pathKey] || {}
    const row = { ...prev }

    if ('nag' in patch) {
        const nag = patch.nag == null || patch.nag === '' ? '' : String(patch.nag)
        if (!isValidPlyUserNag(nag)) return byPathKey || {}
        if (nag) row.nag = nag
        else delete row.nag
    }
    if ('comment' in patch) {
        const comment = patch.comment == null ? '' : String(patch.comment).trim()
        if (comment) row.comment = comment
        else delete row.comment
    }

    if (!row.nag && !row.comment) delete next[pathKey]
    else next[pathKey] = row
    return next
}

/** @param {Record<string, { comment?: string, nag?: string }> | null | undefined} byPathKey @param {number[]} path */
export function getPlyUserAnnotation(byPathKey, path) {
    if (!byPathKey || !path?.length) return null
    return byPathKey[pathKeyFromPath(path)] ?? null
}

/** Sufijo PGN tras SAN: NAG + `{ comentario }`. */
export function formatPgnUserAnnotationSuffix(byPathKey, path) {
    const row = getPlyUserAnnotation(byPathKey, path)
    if (!row) return ''
    let out = ''
    if (row.nag) out += row.nag
    if (row.comment) {
        const safe = row.comment.replace(/\}/g, '').trim()
        if (safe) out += ` { ${safe} }`
    }
    return out
}
