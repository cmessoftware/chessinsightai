import { createEmptyRoot } from './coachVariationTree.js'
import { parseFenInput } from './parseFenInput.js'

/**
 * Árbol de estudio con una sola posición raíz (sin jugadas importadas).
 * @param {string} rawFen
 * @returns {{ ok: true, root: object } | { ok: false, error: string }}
 */
export function createStudyRootFromFen(rawFen) {
    const parsed = parseFenInput(rawFen)
    if (!parsed.ok) {
        return parsed
    }
    return { ok: true, root: createEmptyRoot(parsed.fen) }
}
