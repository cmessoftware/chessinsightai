/**
 * FEAT-075: colored square rings (Coach analysis; reusable for Sparring).
 * Right-click (+ modifiers) toggles color; repeat same gesture removes.
 * Left-click on a marked square clears the ring (any color).
 */

export const SQUARE_CIRCLE_COLORS = {
    green: 'rgba(76, 175, 80, 0.92)',
    red: 'rgba(244, 67, 54, 0.92)',
    blue: 'rgba(33, 150, 243, 0.92)',
    orange: 'rgba(255, 152, 0, 0.92)',
}

/**
 * @param {MouseEvent | { ctrlKey?: boolean; altKey?: boolean; button?: number }} e
 * @returns {'green'|'red'|'blue'|'orange'|null}
 */
export function squareCircleColorFromMouseEvent(e) {
    if (e.button != null && e.button !== 2) {
        return null
    }
    const ctrl = Boolean(e.ctrlKey)
    const alt = Boolean(e.altKey)
    if (ctrl && alt) return 'orange'
    if (ctrl) return 'red'
    if (alt) return 'blue'
    return 'green'
}

/**
 * @param {Record<string, string>|null|undefined} marks square -> color key
 * @param {string} square
 * @param {'green'|'red'|'blue'|'orange'} colorKey
 */
export function toggleSquareCircleMark(marks, square, colorKey) {
    const next = { ...(marks || {}) }
    if (next[square] === colorKey) {
        delete next[square]
    } else {
        next[square] = colorKey
    }
    return next
}

/** @param {Record<string, string>|null|undefined} marks @param {string} square */
export function removeSquareCircleMark(marks, square) {
    if (!marks?.[square]) {
        return marks || {}
    }
    const next = { ...marks }
    delete next[square]
    return next
}

/**
 * Ring overlay merged into react-chessboard squareStyles.
 * @param {Record<string, string>|null|undefined} marks
 */
export function squareCircleMarksToStyles(marks) {
    const out = {}
    if (!marks) return out
    for (const [square, key] of Object.entries(marks)) {
        const stroke = SQUARE_CIRCLE_COLORS[key]
        if (!stroke) continue
        out[square] = {
            backgroundImage: `radial-gradient(circle at center, transparent 58%, ${stroke} 59%, ${stroke} 72%, transparent 73%)`,
        }
    }
    return out
}

export const COACH_SQUARE_CIRCLES_STORAGE_KEY = 'coach.study.squareCircles.v1'

const CIRCLE_COLOR_KEYS = new Set(Object.keys(SQUARE_CIRCLE_COLORS))

/** @param {number[] | null | undefined} path */
export function squareCirclePathKey(path) {
    return path?.length ? path.join('.') : 'root'
}

/** @param {Record<string, string>|null|undefined} marks */
export function normalizeSquareCircleMarks(marks) {
    const out = {}
    if (!marks || typeof marks !== 'object') return out
    for (const [square, key] of Object.entries(marks)) {
        if (!/^[a-h][1-8]$/.test(square)) continue
        if (!CIRCLE_COLOR_KEYS.has(key)) continue
        out[square] = key
    }
    return out
}

/** @returns {Record<string, Record<string, Record<string, string>>>} */
export function loadAllSquareCirclesStore() {
    if (typeof localStorage === 'undefined') return {}
    try {
        const raw = localStorage.getItem(COACH_SQUARE_CIRCLES_STORAGE_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
        return parsed
    } catch {
        return {}
    }
}

/** @param {Record<string, Record<string, Record<string, string>>>} store */
export function saveAllSquareCirclesStore(store) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(COACH_SQUARE_CIRCLES_STORAGE_KEY, JSON.stringify(store))
}

/** @returns {Record<string, Record<string, string>>} pathKey -> marks */
export function loadSquareCirclesForScope(scopeKey) {
    const key = String(scopeKey || '').trim()
    if (!key) return {}
    const block = loadAllSquareCirclesStore()[key]
    if (!block || typeof block !== 'object') return {}
    const out = {}
    for (const [pathKey, marks] of Object.entries(block)) {
        const cleaned = normalizeSquareCircleMarks(marks)
        if (Object.keys(cleaned).length) out[pathKey] = cleaned
    }
    return out
}

/**
 * @param {string} scopeKey
 * @param {Record<string, Record<string, string>>} byPathKey
 */
export function saveSquareCirclesForScope(scopeKey, byPathKey) {
    const key = String(scopeKey || '').trim()
    if (!key) return
    const store = loadAllSquareCirclesStore()
    const cleaned = {}
    for (const [pathKey, marks] of Object.entries(byPathKey || {})) {
        if (!pathKey) continue
        const marksClean = normalizeSquareCircleMarks(marks)
        if (Object.keys(marksClean).length) cleaned[pathKey] = marksClean
    }
    if (Object.keys(cleaned).length === 0) delete store[key]
    else store[key] = cleaned
    saveAllSquareCirclesStore(store)
}

/**
 * Replace marks for one ply. Empty marks drop that ply.
 * @param {Record<string, Record<string, string>>} byPathKey
 * @param {number[] | null | undefined} path
 * @param {Record<string, string>|null|undefined} marks
 */
export function setSquareCirclesForPath(byPathKey, path, marks) {
    const pathKey = squareCirclePathKey(path)
    const next = { ...(byPathKey || {}) }
    const cleaned = normalizeSquareCircleMarks(marks)
    if (Object.keys(cleaned).length === 0) delete next[pathKey]
    else next[pathKey] = cleaned
    return next
}

/** @param {Record<string, Record<string, string>>|null|undefined} byPathKey @param {number[]|null|undefined} path */
export function squareCirclesForPath(byPathKey, path) {
    return byPathKey?.[squareCirclePathKey(path)] || {}
}

/** @param {Record<string, object>} base @param {Record<string, object>} overlay */
export function mergeSquareStyles(base, overlay) {
    const merged = { ...base }
    for (const [sq, style] of Object.entries(overlay || {})) {
        merged[sq] = { ...(merged[sq] || {}), ...style }
    }
    return merged
}
