import { useEffect, useRef, useState } from 'react'
import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material'
import api from '../services/api.js'
import {
    chartLayout,
    defaultSpeedClass,
    formatRating,
    formatReportDate,
    rankingCharts,
    rankingParagraphs,
} from '../reports/rankingReport.js'
import ReportExportControls from './ReportExportControls.jsx'

const PERIODS = [
    { months: 6, label: 'Últimos 6 meses' },
    { months: 12, label: 'Últimos 12 meses' },
    { months: 24, label: 'Últimos 24 meses' },
    { months: 60, label: 'Últimos 5 años' },
]

function RatingChart({ series }) {
    const layout = chartLayout(series)
    if (!layout) {
        return (
            <Typography variant="body2" color="text.secondary">
                Hace falta más de una partida para el gráfico.
            </Typography>
        )
    }
    return (
        <Box sx={{ mt: 1, color: 'text.primary' }}>
            <svg
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                role="img"
                aria-label="Variación del ranking por fecha"
                width="100%"
            >
                <line
                    x1={layout.axis.left}
                    y1={layout.axis.top}
                    x2={layout.axis.left}
                    y2={layout.axis.bottom}
                    stroke="currentColor"
                />
                <line
                    x1={layout.axis.left}
                    y1={layout.axis.bottom}
                    x2={layout.axis.right}
                    y2={layout.axis.bottom}
                    stroke="currentColor"
                />
                {layout.yTicks.map((tick) => (
                    <text
                        key={`y-${tick.rating}-${tick.y}`}
                        x={layout.axis.left - 6}
                        y={tick.y + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="currentColor"
                    >
                        {formatRating(tick.rating)}
                    </text>
                ))}
                {layout.xTicks.map((tick) => (
                    <text
                        key={`x-${tick.label}-${tick.x}`}
                        x={tick.x}
                        y={layout.axis.bottom + 18}
                        textAnchor="middle"
                        fontSize="11"
                        fill="currentColor"
                    >
                        {tick.label}
                    </text>
                ))}
                <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    points={layout.points.map((point) => `${point.x},${point.y}`).join(' ')}
                />
                {layout.points.map((point) => (
                    <circle key={`${point.date}-${point.x}`} cx={point.x} cy={point.y} r="6" fill="currentColor">
                        <title>{`${formatReportDate(point.date)} · ${formatRating(point.rating)}`}</title>
                    </circle>
                ))}
            </svg>
            <Typography variant="caption" color="text.secondary">
                Pasá el mouse sobre un punto para ver la fecha y el ranking.
            </Typography>
        </Box>
    )
}

function RhythmBlock({ rhythm }) {
    const stats = [
        ['Mínimo', rhythm.minimum],
        ['Promedio', rhythm.average],
        ['Máximo', rhythm.maximum],
    ]
    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6">
                {rhythm.label} · {rhythm.games} {rhythm.games === 1 ? 'partida' : 'partidas'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1 }}>
                {stats.map(([label, value]) => (
                    <Box key={label}>
                        <Typography variant="overline">{label}</Typography>
                        <Typography variant="h5">{formatRating(value.rating)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {formatReportDate(value.date)}
                        </Typography>
                    </Box>
                ))}
            </Box>
            <Typography variant="caption" color="text.secondary">
                La fecha del promedio es la de la partida más cercana a ese valor.
            </Typography>
            <RatingChart series={rhythm.series} />
        </Box>
    )
}

export function RankingReportView({ report, data, months, onMonthsChange, player, onPlayerChange }) {
    const rhythms = data?.rhythms || []
    const [speed, setSpeed] = useState(() => defaultSpeedClass(rhythms))
    const [format, setFormat] = useState('markdown')
    const [downloaded, setDownloaded] = useState('')
    const selected = rhythms.find((rhythm) => rhythm.speed_class === speed) || rhythms[0] || null
    const paragraphs = rankingParagraphs(data, selected?.speed_class)
    const charts = rankingCharts(data, selected?.speed_class)

    useEffect(() => {
        const next = defaultSpeedClass(rhythms)
        if (!rhythms.some((rhythm) => rhythm.speed_class === speed)) setSpeed(next)
    }, [rhythms, speed])

    const exportControls = (controlId) => (
        <ReportExportControls
            report={report}
            paragraphs={paragraphs}
            charts={charts}
            controlId={controlId}
            format={format}
            onFormatChange={(value) => {
                setFormat(value)
                setDownloaded('')
            }}
            downloaded={downloaded}
            onDownloaded={setDownloaded}
        />
    )

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                {(data?.players || []).length > 0 ? (
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel id="ranking-player-label">Jugador</InputLabel>
                        <Select
                            labelId="ranking-player-label"
                            label="Jugador"
                            value={player || data.player || ''}
                            onChange={(event) => onPlayerChange(event.target.value)}
                        >
                            {data.players.map((name) => (
                                <MenuItem key={name} value={name}>
                                    {name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : null}
                <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel id="ranking-period-label">Período</InputLabel>
                    <Select
                        labelId="ranking-period-label"
                        label="Período"
                        value={months}
                        onChange={(event) => onMonthsChange(Number(event.target.value))}
                    >
                        {PERIODS.map((period) => (
                            <MenuItem key={period.months} value={period.months}>
                                {period.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {rhythms.length > 0 ? (
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel id="ranking-speed-label">Ritmo</InputLabel>
                        <Select
                            labelId="ranking-speed-label"
                            label="Ritmo"
                            value={selected?.speed_class || ''}
                            onChange={(event) => setSpeed(event.target.value)}
                        >
                            {rhythms.map((rhythm) => (
                                <MenuItem key={rhythm.speed_class} value={rhythm.speed_class}>
                                    {rhythm.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : null}
            </Box>
            {data ? (
                <>
                    {exportControls('report-format-top')}
                    <Typography color="text.secondary" sx={{ mt: 2 }}>
                        {formatReportDate(data.from)} a {formatReportDate(data.to)}
                    </Typography>
                    {selected ? (
                        <RhythmBlock rhythm={selected} />
                    ) : (
                        <Typography sx={{ mt: 2 }}>No hay partidas con ranking en este período.</Typography>
                    )}
                    {data.skipped > 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            {data.skipped === 1
                                ? '1 partida quedó fuera porque no tiene fecha, ritmo o ranking.'
                                : `${data.skipped} partidas quedaron fuera porque no tienen fecha, ritmo o ranking.`}
                        </Typography>
                    ) : null}
                    {exportControls('report-format-bottom')}
                </>
            ) : null}
        </Box>
    )
}

export default function RankingReportPanel({ report }) {
    const [months, setMonths] = useState(12)
    const [player, setPlayer] = useState('')
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [requestId, setRequestId] = useState(0)
    const playerRef = useRef('')

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError('')
        const requested = playerRef.current
        const params = { months }
        if (requested) params.player = requested
        api.get('/api/reports/ranking', { params })
            .then((response) => {
                if (cancelled) return
                setData(response.data)
                const resolved = response.data?.player || ''
                if (!requested && resolved) {
                    playerRef.current = resolved
                    setPlayer(resolved)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setData(null)
                    setError('No se pudo cargar el ranking.')
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [months, requestId])

    const choosePlayer = (name) => {
        playerRef.current = name
        setPlayer(name)
        setRequestId((current) => current + 1)
    }

    if (loading) {
        return <Typography color="text.secondary">Cargando el ranking…</Typography>
    }
    if (error) {
        return <Typography color="error">{error}</Typography>
    }
    return (
        <RankingReportView
            report={report}
            data={data}
            months={months}
            onMonthsChange={setMonths}
            player={player}
            onPlayerChange={choosePlayer}
        />
    )
}
