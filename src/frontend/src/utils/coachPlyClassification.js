import { Chess } from 'chess.js'
import {
    classifyMoveFromEvals,
    parsePlayerColor,
    scoreFromEngineLine,
} from './coachEngineLabels.js'
import { uciPvToSan } from './uciStockfish.js'

/** @typedef {import('./coachEngineLabels.js').PlayerScore} PlayerScore */

/**
 * @typedef {Object} PlayerPlyJob
 * @property {number[]} path
 * @property {string} pathKey
 * @property {number} ply
 * @property {string} fenBefore
 * @property {string} playedUci
 * @property {string} fenAfter
 * @property {string} san
 * @property {'white' | 'black'} moverColor
 */

export function pathKeyFromPath(path) {
    return path?.length ? path.join('.') : 'root'
}

/** Main-line plies where `playerColor` is side to move (solo jugador analizado). */
export function collectMainLinePlayerPlies(root, playerColor) {
    return collectMainLinePlies(root).filter((j) => j.moverColor === parsePlayerColor(playerColor))
}

/** Todas las jugadas de la línea principal (etiquetas blancas y negras). */
export function collectMainLinePlies(root) {
    if (!root?.fen) return []
    /** @type {PlayerPlyJob[]} */
    const jobs = []
    let node = root
    let path = []

    while (node.children?.length > 0) {
        const parent = node
        const child = node.children[0]
        path = [...path, 0]
        const stm = (parent.fen.split(/\s+/)[1] || 'w').toLowerCase()
        if (child.uci) {
            jobs.push({
                path: [...path],
                pathKey: pathKeyFromPath(path),
                ply: path.length,
                fenBefore: parent.fen,
                playedUci: child.uci,
                fenAfter: child.fen,
                san: child.san,
                moverColor: stm === 'b' ? 'black' : 'white',
            })
        }
        node = child
    }
    return jobs
}

function normalizeUci(uci) {
    return (uci || '').toLowerCase()
}

function rawLineToPlayerScore(line, fenAtAnalysis, playerColor) {
    return scoreFromEngineLine({
        cp: line.cp,
        mate: line.mate,
        fen: fenAtAnalysis,
        playerColor,
    })
}

/**
 * @param {import('../engine/clientStockfishEngine.js').StockfishBrowserEngine} engine
 * @param {PlayerPlyJob} job
 * @param {{ depth?: number, multipv?: number, priority?: 'live' | 'normal' }} [options]
 */
export async function classifyPlyWithEngine(
    engine,
    job,
    { depth = 12, multipv = 3, priority = 'normal', playerColor = 'white' } = {},
) {
    const pov = parsePlayerColor(job.moverColor ?? playerColor)
    const playedNorm = normalizeUci(job.playedUci)

    const raw = await engine.analyze(
        { fen: job.fenBefore, depth, multipv },
        { priority },
    )
    if (!raw?.length) {
        return {
            engineLabel: 'pending',
            cpLoss: null,
            evalGapCp: null,
            mateStatus: 'unclear',
            reason: 'no_engine_lines',
            pathKey: job.pathKey,
            ply: job.ply,
            san: job.san,
        }
    }

    /** @type {PlayerScore} */
    const bestScore = rawLineToPlayerScore(raw[0], job.fenBefore, pov)

    const matched = raw.find((line) => normalizeUci(line.pvUci?.[0]) === playedNorm)
    /** @type {PlayerScore} */
    let playedScore
    if (matched) {
        playedScore = rawLineToPlayerScore(matched, job.fenBefore, pov)
    } else {
        try {
            const chess = new Chess(job.fenBefore)
            const m = chess.move({
                from: job.playedUci.slice(0, 2),
                to: job.playedUci.slice(2, 4),
                promotion: job.playedUci.length > 4 ? job.playedUci[4] : undefined,
            })
            if (!m) {
                return {
                    engineLabel: 'pending',
                    cpLoss: null,
                    evalGapCp: null,
                    mateStatus: 'unclear',
                    reason: 'illegal_played_uci',
                    pathKey: job.pathKey,
                    ply: job.ply,
                    san: job.san,
                }
            }
        } catch {
            return {
                engineLabel: 'pending',
                cpLoss: null,
                evalGapCp: null,
                mateStatus: 'unclear',
                reason: 'illegal_played_uci',
                pathKey: job.pathKey,
                ply: job.ply,
                san: job.san,
            }
        }

        const afterRaw = await engine.analyze({ fen: job.fenAfter, depth, multipv: 1 }, { priority })
        if (!afterRaw?.length) {
            return {
                engineLabel: 'pending',
                cpLoss: null,
                evalGapCp: null,
                mateStatus: 'unclear',
                reason: 'no_played_eval',
                pathKey: job.pathKey,
                ply: job.ply,
                san: job.san,
            }
        }
        playedScore = rawLineToPlayerScore(afterRaw[0], job.fenAfter, pov)
    }

    const bestPvSan = uciPvToSan(job.fenBefore, raw[0].pvUci || [])
    const multipvMovesUci = raw
        .map((line) => line.pvUci?.[0])
        .filter(Boolean)
        .slice(0, multipv)
    const result = classifyMoveFromEvals({ bestScore, playedScore })
    return {
        ...result,
        pathKey: job.pathKey,
        ply: job.ply,
        san: job.san,
        moverColor: pov,
        bestScore,
        playedScore,
        bestMoveUci: raw[0].pvUci?.[0] || null,
        multipvMovesUci,
        bestPvSan,
        playedInMultipv: Boolean(matched),
    }
}
