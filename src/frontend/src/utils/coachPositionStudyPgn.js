import { buildStudyPgnFromTree } from './coachPgnTreeParse.js'
import { ensurePgnSetupHeader } from './coachPgnReplay.js'
import { formatPgnHeaderBlock } from './pgnHeaders.js'
import { parseFenInput } from './parseFenInput.js'

function pad2(value) {
    return String(value).padStart(2, '0')
}

/**
 * Header block for a FEN-only study game (FEAT-103).
 * @param {string} rawFen
 * @param {{ event?: string, studyName?: string, now?: Date }} [options]
 */
export function buildPositionStudyHeadersPgn(rawFen, options = {}) {
    const parsed = parseFenInput(rawFen)
    if (!parsed.ok) {
        return { ok: false, error: parsed.error }
    }
    const now = options.now instanceof Date ? options.now : new Date()
    const date = `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())}`
    const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`
    const rows = [
        { tag: 'Event', value: options.event || 'Posición de estudio' },
        { tag: 'Site', value: '?' },
        { tag: 'Date', value: date },
        { tag: 'Round', value: '?' },
        { tag: 'White', value: '?' },
        { tag: 'Black', value: '?' },
        { tag: 'Result', value: '*' },
        { tag: 'SetUp', value: '1' },
        { tag: 'FEN', value: parsed.fen },
        { tag: 'UTCDate', value: date },
        { tag: 'UTCTime', value: time },
        { tag: 'StudyName', value: options.studyName || 'Posición' },
    ]
    const sourcePgn = `${formatPgnHeaderBlock(rows)}\n\n*`
    return { ok: true, fen: parsed.fen, sourcePgn }
}

/**
 * Full ingestible PGN from the current variation tree on Cargar Posición.
 * @param {object} treeRoot
 * @param {{ studyName?: string, event?: string }} [options]
 */
export function buildPositionStudyPgnFromTree(treeRoot, options = {}) {
    const fen = treeRoot?.fen
    if (!fen) {
        return { ok: false, error: 'No hay posición en el tablero.' }
    }
    const headers = buildPositionStudyHeadersPgn(fen, options)
    if (!headers.ok) {
        return headers
    }
    if (!treeRoot?.children?.length) {
        return { ok: true, pgn: ensurePgnSetupHeader(headers.sourcePgn) }
    }
    const pgn = buildStudyPgnFromTree(treeRoot, headers.sourcePgn, { result: '*' })
    return { ok: true, pgn: ensurePgnSetupHeader(pgn) }
}