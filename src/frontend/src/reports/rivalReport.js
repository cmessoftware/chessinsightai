/** RPT-FEAT-05: rival ranking and precision, only in games against the chosen player. */

import { formatReportDate, formatRating, playerLine } from './rankingReport.js'
import { formatPrecision } from './precisionReport.js'

const PHASES = [
    ['precision_general', 'precisión'],
    ['precision_apertura', 'apertura'],
    ['precision_medio_juego', 'medio juego'],
    ['precision_final', 'final'],
]

export function rivalParagraphs(data, speedClass = null) {
    if (!data) return []
    const period = `Período: ${formatReportDate(data.from)} a ${formatReportDate(data.to)}.`
    const mine = data.player ? playerLine([data.player]) : ''
    const rival = data.rival ? `Rival: ${data.rival}, solo en las partidas contra ${data.player}.` : ''
    const rhythm = (data.rhythms || []).find((item) => item.speed_class === speedClass) || null
    if (!data.rival || !rhythm) {
        return [mine, rival, period, 'No hay partidas contra este rival en este período.'].filter(Boolean)
    }
    const lines = [mine, rival, period].filter(Boolean)
    const ranking = rhythm.ranking
    if (ranking) {
        lines.push(
            `${ranking.label}: mínimo ${formatRating(ranking.minimum.rating)} (${formatReportDate(ranking.minimum.date)}), promedio ${formatRating(ranking.average.rating)} (${formatReportDate(ranking.average.date)}), máximo ${formatRating(ranking.maximum.rating)} (${formatReportDate(ranking.maximum.date)}). ${ranking.games} partidas.`,
        )
    }
    const precision = rhythm.precision
    if (precision) {
        const phases = PHASES.map(([key, label]) => {
            const metric = precision[key] || { mean: null, n: 0 }
            if (metric.mean == null) return `${label} sin datos`
            return `${label} ${formatPrecision(metric.mean)} (${metric.n})`
        }).join(', ')
        lines.push(`${precision.label}: ${phases}.`)
    }
    return lines
}

export function rivalCharts(data, speedClass = null) {
    if (!data?.rival) return []
    const rhythm = (data.rhythms || []).find((item) => item.speed_class === speedClass)
    if (!rhythm) return []
    const charts = []
    const rankingSeries = rhythm.ranking?.rival_series?.length
        ? rhythm.ranking.rival_series
        : rhythm.ranking?.series || []
    const rankingMine = rhythm.ranking?.mine_series || []
    if (rankingSeries.length >= 2 || rankingMine.length >= 2) {
        charts.push({
            title: `Ranking en ${rhythm.label}`,
            series: rankingMine.length >= 2 ? rankingMine : rankingSeries,
            comparison: rankingMine.length >= 2 ? rankingSeries : null,
        })
    }
    const precisionSeries = rhythm.precision?.rival_series?.length
        ? rhythm.precision.rival_series
        : rhythm.precision?.series || []
    const precisionMine = rhythm.precision?.mine_series || []
    if (precisionSeries.length >= 2 || precisionMine.length >= 2) {
        charts.push({
            title: `Precisión en ${rhythm.label}`,
            valueLabel: 'Precisión',
            series: precisionMine.length >= 2 ? precisionMine : precisionSeries,
            comparison: precisionMine.length >= 2 ? precisionSeries : null,
        })
    }
    return charts
}
