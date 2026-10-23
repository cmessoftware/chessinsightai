import { collectMainLinePlies } from './coachPlyClassification.js'
import { moveNumberFromPlyCount } from './coachVariationTree.js'
import { formatStandardEval, playerScoreToCp, toWhiteStandardScore } from './engineEval.js'

/** Escala mínima del gráfico (±100 cp) cuando la partida no se aleja del equilibrio. */
export const CP_CHART_DEFAULT_SPAN = 100
/** Tope de escala para no aplastar evals moderadas en partidas con mate en cp. */
export const CP_CHART_ABSOLUTE_MAX_SPAN = 2000

/** @deprecated use CP_CHART_DEFAULT_SPAN */
export const CP_CHART_MIN = -CP_CHART_DEFAULT_SPAN
/** @deprecated use CP_CHART_DEFAULT_SPAN */
export const CP_CHART_MAX = CP_CHART_DEFAULT_SPAN

/**
 * BUG-060: escala Y simétrica según el máximo |cp| de la serie (evita saturar en ±100).
 * @param {{ cp?: number | null }[]} series
 */
export function computeChartCpSpan(series) {
    let maxAbs = CP_CHART_DEFAULT_SPAN
    for (const pt of series || []) {
        const cp = pt?.cp
        if (cp == null || !Number.isFinite(cp)) continue
        maxAbs = Math.max(maxAbs, Math.abs(cp))
    }
    if (maxAbs <= CP_CHART_DEFAULT_SPAN) return CP_CHART_DEFAULT_SPAN
    if (maxAbs <= 250) return Math.ceil(maxAbs / 50) * 50
    if (maxAbs <= 600) return Math.ceil(maxAbs / 100) * 100
    if (maxAbs <= 1200) return Math.ceil(maxAbs / 200) * 200
    return Math.min(CP_CHART_ABSOLUTE_MAX_SPAN, Math.ceil(maxAbs / 500) * 500)
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
            cp: playerScoreToCp(rootScore),
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
            cp: playerScoreToCp(score),
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
