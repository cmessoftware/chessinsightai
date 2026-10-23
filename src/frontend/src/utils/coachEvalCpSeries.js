import { collectMainLinePlies } from './coachPlyClassification.js'
import { moveNumberFromPlyCount } from './coachVariationTree.js'
import {
    CP_CHART_MAX_CP,
    formatStandardEval,
    playerScoreToChartCp,
    toWhiteStandardScore,
} from './engineEval.js'

/** Eje Y fijo ±2000 cp (≈ ±20 peones); evals y mates se mapean dentro de ese rango. */
export const CP_CHART_ABSOLUTE_MAX_SPAN = CP_CHART_MAX_CP

/** @deprecated */
export const CP_CHART_DEFAULT_SPAN = CP_CHART_MAX_CP
/** @deprecated */
export const CP_CHART_MIN = -CP_CHART_MAX_CP
/** @deprecated */
export const CP_CHART_MAX = CP_CHART_MAX_CP

/** Escala Y del gráfico (siempre ±2000 cp). */
export function computeChartCpSpan(_series) {
    return CP_CHART_MAX_CP
}

/** Tree path along main line (all child index 0). */
export function mainLinePathForPly(ply) {
    const n = Math.max(0, Number(ply) || 0)
    return Array.from({ length: n }, () => 0)
}

/** @param {{ ply: number, moveNumber: number, evalLabel: string }} point */
export function formatEvalChartTooltip(point) {
    if (!point) return ''
    if (point.ply === 0) {
        return point.evalLabel && point.evalLabel !== '—' ? `Inicio · ${point.evalLabel}` : 'Inicio'
    }
    return `Jugada ${point.moveNumber} · ${point.evalLabel || '—'}`
}

/** Subsample move-number labels for the x-axis (FEAT-047.2). */
export function selectMoveNumberAxisTicks(series, maxLabels = 12) {
    if (!series?.length) return []
    /** @type {{ index: number, moveNumber: number }[]} */
    const candidates = []
    let prev = -1
    series.forEach((pt, index) => {
        const mn = pt.moveNumber ?? 0
        if (mn > 0 && mn !== prev) {
            candidates.push({ index, moveNumber: mn })
            prev = mn
        }
    })
    if (candidates.length <= maxLabels) return candidates
    const step = Math.ceil(candidates.length / maxLabels)
    return candidates.filter((_, i) => i % step === 0 || i === candidates.length - 1)
}

/**
 * Main-line eval series for FEAT-047 (standard white POV cp after each position).
 * @param {object | null} treeRoot
 * @param {Record<string, object>} scoreByFen fen → score (white POV in cache)
 */
export function buildMainLineEvalCpSeries(treeRoot, scoreByFen) {
    if (!treeRoot?.fen) return []
    const rootScore = toWhiteStandardScore(scoreByFen?.[treeRoot.fen])
    /** @type {ReturnType<typeof buildMainLineEvalCpSeries>} */
    const out = [
        {
            ply: 0,
            moveNumber: 0,
            path: mainLinePathForPly(0),
            fen: treeRoot.fen,
            cp: playerScoreToChartCp(rootScore),
            evalLabel: formatStandardEval(rootScore),
        },
    ]
    for (const job of collectMainLinePlies(treeRoot)) {
        const score = toWhiteStandardScore(scoreByFen?.[job.fenAfter])
        const point = {
            ply: job.ply,
            moveNumber: moveNumberFromPlyCount(job.ply),
            path: mainLinePathForPly(job.ply),
            fen: job.fenAfter,
            cp: playerScoreToChartCp(score),
            evalLabel: formatStandardEval(score),
        }
        point.tooltip = formatEvalChartTooltip(point)
        out.push(point)
    }
    out[0].tooltip = formatEvalChartTooltip(out[0])
    return out
}

/** Ply index on main line from tree cursor (stops at first variation index). */
export function mainLinePlyFromCursorPath(cursorPath) {
    if (!cursorPath?.length) return 0
    let ply = 0
    for (let i = 0; i < cursorPath.length; i++) {
        if (cursorPath[i] !== 0) break
        ply += 1
    }
    return ply
}
