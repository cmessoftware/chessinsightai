/** RPT-FEAT-03: text of the ranking report for the screen and the download. */

export function formatReportDate(iso) {
    const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) return String(iso || '')
    return `${match[3]}/${match[2]}/${match[1]}`
}

export function formatRating(value) {
    const number = Number(value)
    if (!Number.isFinite(number)) return ''
    return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

export function playerLine(players) {
    const names = (players || []).map((name) => String(name).trim()).filter(Boolean)
    if (names.length === 0) return ''
    if (names.length === 1) return `Jugador: ${names[0]}.`
    return `Jugadores: ${names.join(', ')}.`
}

export function defaultSpeedClass(rhythms) {
    if (rhythms?.some((rhythm) => rhythm.speed_class === 'rapid')) return 'rapid'
    return rhythms?.[0]?.speed_class || ''
}

export function rankingParagraphs(data, speedClass = null) {
    if (!data) return []
    const period = `Período: ${formatReportDate(data.from)} a ${formatReportDate(data.to)}.`
    const player = data.player ? playerLine([data.player]) : ''
    const rhythms = speedClass
        ? (data.rhythms || []).filter((rhythm) => rhythm.speed_class === speedClass)
        : data.rhythms || []
    if (!rhythms.length) {
        return [player, period, 'No hay partidas con ranking en este período.'].filter(Boolean)
    }
    const lines = [player, period].filter(Boolean)
    for (const rhythm of rhythms) {
        lines.push(
            `${rhythm.label}: mínimo ${formatRating(rhythm.minimum.rating)} (${formatReportDate(rhythm.minimum.date)}), promedio ${formatRating(rhythm.average.rating)} (${formatReportDate(rhythm.average.date)}), máximo ${formatRating(rhythm.maximum.rating)} (${formatReportDate(rhythm.maximum.date)}). ${rhythm.games} partidas.`,
        )
    }
    return lines
}

export function rankingCharts(data, speedClass = null) {
    if (!data) return []
    const rhythms = speedClass
        ? (data.rhythms || []).filter((rhythm) => rhythm.speed_class === speedClass)
        : data.rhythms || []
    return rhythms
        .filter((rhythm) => (rhythm.series || []).length >= 2)
        .map((rhythm) => ({ title: `Variación de ${rhythm.label}`, series: rhythm.series }))
}

const CHART_WIDTH = 640
const CHART_HEIGHT = 260
const CHART_PAD = { left: 56, right: 16, top: 16, bottom: 40 }

export function chartLayout(series, comparison = null) {
    const primary = series || []
    const extra = comparison || []
    const count = Math.max(primary.length, extra.length)
    if (count < 2) return null
    const ratings = [...primary, ...extra].map((point) => Number(point.rating)).filter(Number.isFinite)
    if (!ratings.length) return null
    let min = Math.min(...ratings)
    let max = Math.max(...ratings)
    if (min === max) {
        min -= 10
        max += 10
    }
    const span = max - min
    const innerWidth = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right
    const innerHeight = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom
    const yAt = (rating) => CHART_PAD.top + (1 - (rating - min) / span) * innerHeight
    const xAt = (index) => CHART_PAD.left + (index * innerWidth) / (count - 1)
    const place = (list) =>
        list.map((point, index) => ({
            x: xAt(index),
            y: yAt(Number(point.rating)),
            date: point.date,
            rating: point.rating,
        }))
    const points = place(primary)
    const compared = extra.length ? place(extra) : []
    const tickSource = primary.length >= extra.length ? primary : extra
    const tickPoints = primary.length >= extra.length ? points : compared
    const yTicks = [min, min + span / 2, max].map((rating) => ({
        rating: Math.round(rating),
        y: yAt(rating),
    }))
    const indexes = [...new Set([0, Math.floor((tickSource.length - 1) / 2), tickSource.length - 1])]
    const xTicks = indexes.map((index) => ({
        label: formatReportDate(tickSource[index].date),
        x: tickPoints[index].x,
    }))
    return {
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
        points,
        comparison: compared,
        yTicks,
        xTicks,
        axis: {
            left: CHART_PAD.left,
            right: CHART_WIDTH - CHART_PAD.right,
            top: CHART_PAD.top,
            bottom: CHART_HEIGHT - CHART_PAD.bottom,
        },
    }
}

export function chartPoints(series) {
    return chartLayout(series)?.points || []
}
