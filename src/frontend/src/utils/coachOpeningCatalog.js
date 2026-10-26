/** @typedef {{ eco: string, name: string }} EcoOpeningEntry */

const CATALOG_URL = '/config/eco_openings.v1.json'

/** @type {Promise<{ openings: EcoOpeningEntry[] }> | null} */
let catalogPromise = null

export function formatOpeningCatalogLabel(entry) {
    if (!entry?.eco || !entry?.name) return ''
    return `${entry.eco} — ${entry.name}`
}

export function loadEcoOpeningsCatalog() {
    if (!catalogPromise) {
        catalogPromise = fetch(CATALOG_URL)
            .then((res) => {
                if (!res.ok) throw new Error(`ECO catalog HTTP ${res.status}`)
                return res.json()
            })
            .then((data) => ({
                openings: Array.isArray(data?.openings) ? data.openings : [],
                meta: data?.meta ?? null,
            }))
            .catch((err) => {
                catalogPromise = null
                throw err
            })
    }
    return catalogPromise
}

/**
 * Wildcard `*` on ECO and opening name (FEAT-065).
 * @param {EcoOpeningEntry[]} openings
 * @param {string} query
 * @param {number} [limit]
 */
export function searchEcoOpeningsCatalog(openings, query, limit = 40) {
    const q = String(query || '').trim()
    if (!q) return openings.slice(0, limit)
    const parts = q.split(/\s+/).filter(Boolean)
    const patterns = parts.map((part) => {
        const escaped = part.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
        return new RegExp(escaped, 'i')
    })
    const out = []
    for (const entry of openings) {
        const hayEco = entry.eco || ''
        const hayName = entry.name || ''
        const hayCombo = `${hayEco} ${hayName}`
        const ok = patterns.every(
            (re) => re.test(hayEco) || re.test(hayName) || re.test(hayCombo),
        )
        if (ok) {
            out.push(entry)
            if (out.length >= limit) break
        }
    }
    return out
}

/** Same key for Autocomplete value/options. */
export function openingCatalogEntryKey(entry) {
    return `${entry?.eco || ''}\u0000${entry?.name || ''}`
}

export function parseOpeningCatalogKey(key) {
    const [eco, name] = String(key || '').split('\u0000')
    if (!eco || !name) return null
    return { eco, name }
}
