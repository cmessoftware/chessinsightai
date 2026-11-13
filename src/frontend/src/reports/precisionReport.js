/** RPT-FEAT-04: precision by speed class for the screen and the download. */

import { defaultSpeedClass, formatReportDate, playerLine } from './rankingReport.js'

const PHASES = [
    ['precision_general', 'precisión'],
    ['precision_apertura', 'apertura'],
    ['precision_medio_juego', 'medio juego'],
    ['precision_final', 'final'],
]

export function formatPrecision(value) {
    const number = Number(value)
    if (!Number.isFinite(number)) return 'sin datos'
    return `${number.toFixed(1)}%`
}

export function precisionParagraphs(data, speedClass = null) {
    if (!data) return []
    const period = `Período: ${formatReportDate(data.from)} a ${formatReportDate(data.to)}.`
    const player = data.player ? playerLine([data.player]) : ''
    const rhythms = speedClass
        ? (data.rhythms || []).filter((rhythm) => rhythm.speed_class === speedClass)
        : data.rhythms || []
    if (!rhythms.length) {
        return [player, period, 'No hay partidas con precisión en este período.'].filter(Boolean)
    }
    const lines = [player, period].filter(Boolean)
    for (const rhythm of rhythms) {
        const phases = PHASES.map(([key, label]) => {
            const metric = rhythm[key] || { mean: null, n: 0 }
            if (metric.mean == null) return `${label} sin datos`
            return `${label} ${formatPrecision(metric.mean)} (${metric.n})`
        }).join(', ')
        const games = `${rhythm.games} ${rhythm.games === 1 ? 'partida' : 'partidas'}`
        lines.push(`${rhythm.label}: ${phases}. ${games}.`)
    }
    return lines
}

export function precisionCharts(data, speedClass = null) {
    if (!data) return []
    const rhythms = speedClass
        ? (data.rhythms || []).filter((rhythm) => rhythm.speed_class === speedClass)
        : data.rhythms || []
    return rhythms
        .filter((rhythm) => (rhythm.series || []).length >= 2)
        .map((rhythm) => ({
            title: `Precisión de ${rhythm.label}`,
            valueLabel: 'Precisión',
            series: rhythm.series,
        }))
}

export { defaultSpeedClass }
