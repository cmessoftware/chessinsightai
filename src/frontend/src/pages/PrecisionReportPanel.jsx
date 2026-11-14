import { useEffect, useRef, useState } from 'react'
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material'
import api from '../services/api.js'
import { chartLayout, formatReportDate } from '../reports/rankingReport.js'
import {
    defaultSpeedClass,
    formatPrecision,
    precisionCharts,
    precisionParagraphs,
} from '../reports/precisionReport.js'
import ReportExportControls from './ReportExportControls.jsx'

const PERIODS = [
    { months: 6, label: 'Últimos 6 meses' },
    { months: 12, label: 'Últimos 12 meses' },
    { months: 24, label: 'Últimos 24 meses' },
    { months: 60, label: 'Últimos 5 años' },
]

const PHASES = [
    ['precision_general', 'General'],
    ['precision_apertura', 'Apertura'],
    ['precision_medio_juego', 'Medio juego'],
    ['precision_final', 'Final'],
]

function PrecisionChart({ series }) {
    const layout = chartLayout(series)
    if (!layout) {
        return (
            <Typography variant="body2" color="text.secondary">
                Hace falta más de una partida con precisión general para el gráfico.
            </Typography>
        )
    }
    return (
        <Box sx={{ mt: 1, color: 'text.primary' }}>
            <svg
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                role="img"
                aria-label="Precisión general por fecha"
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
                        {formatPrecision(tick.rating)}
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
                        <title>{`${formatReportDate(point.date)} · ${formatPrecision(point.rating)}`}</title>
                    </circle>
                ))}
            </svg>
            <Typography variant="caption" color="text.secondary">
                Pasá el mouse sobre un punto para ver la fecha y la precisión.
            </Typography>
        </Box>
    )
}

function RhythmBlock({ rhythm }) {
    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6">
                {rhythm.label} · {rhythm.games} {rhythm.games === 1 ? 'partida' : 'partidas'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1 }}>
                {PHASES.map(([key, label]) => (
                    <Box key={key}>
                        <Typography variant="overline">{label}</Typography>
                        <Typography variant="h5">{formatPrecision(rhythm[key]?.mean)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {rhythm[key]?.n ? `${rhythm[key].n} con dato` : 'sin datos'}
                        </Typography>
                    </Box>
                ))}
            </Box>
            <PrecisionChart series={rhythm.series} />
        </Box>
    )
}

export function PrecisionReportView({
    report,
    data,
    months,
    onMonthsChange,
    player,
    onPlayerChange,
    onCalculate,
    calculating,
    notice,
    noticeTone,
}) {
    const rhythms = data?.rhythms || []
    const [speed, setSpeed] = useState(() => defaultSpeedClass(rhythms))
    const [format, setFormat] = useState('markdown')
    const [downloaded, setDownloaded] = useState('')
    const selected = rhythms.find((rhythm) => rhythm.speed_class === speed) || rhythms[0] || null
    const paragraphs = precisionParagraphs(data, selected?.speed_class)
    const charts = precisionCharts(data, selected?.speed_class)

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
                        <InputLabel id="precision-player-label">Jugador</InputLabel>
                        <Select
                            labelId="precision-player-label"
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
                    <InputLabel id="precision-period-label">Período</InputLabel>
                    <Select
                        labelId="precision-period-label"
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
                        <InputLabel id="precision-speed-label">Ritmo</InputLabel>
                        <Select
                            labelId="precision-speed-label"
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
                    {exportControls('precision-format-top')}
                    <Typography color="text.secondary" sx={{ mt: 2 }}>
                        {formatReportDate(data.from)} a {formatReportDate(data.to)}
                    </Typography>
                    {data.pending > 0 ? (
                        <Box sx={{ mt: 2 }}>
                            <Typography>
                                {data.pending === 1
                                    ? 'Hay 1 partida sin precisión en este período.'
                                    : `Hay ${data.pending} partidas sin precisión en este período.`}
                            </Typography>
                            <Button variant="contained" sx={{ mt: 1 }} disabled={calculating} onClick={onCalculate}>
                                Calcular precisión
                            </Button>
                            {notice ? (
                                <Typography
                                    sx={{
                                        mt: 2,
                                        color: noticeTone === 'error' ? 'error.main' : '#1b7a32',
                                        fontSize: noticeTone === 'ok' ? '1.5rem' : '1rem',
                                        fontWeight: noticeTone === 'ok' ? 700 : 500,
                                        lineHeight: 1.35,
                                    }}
                                >
                                    {notice}
                                </Typography>
                            ) : null}
                        </Box>
                    ) : null}
                    {selected ? (
                        <RhythmBlock rhythm={selected} />
                    ) : (
                        <Typography sx={{ mt: 2 }}>No hay partidas con precisión en este período.</Typography>
                    )}
                    {data.skipped > 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            {data.skipped === 1
                                ? '1 partida quedó fuera porque no tiene fecha, ritmo o precisión.'
                                : `${data.skipped} partidas quedaron fuera porque no tienen fecha, ritmo o precisión.`}
                        </Typography>
                    ) : null}
                    {exportControls('precision-format-bottom')}
                </>
            ) : null}
        </Box>
    )
}

export default function PrecisionReportPanel({ report }) {
    const [months, setMonths] = useState(12)
    const [player, setPlayer] = useState('')
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [requestId, setRequestId] = useState(0)
    const [calculating, setCalculating] = useState(false)
    const [notice, setNotice] = useState('')
    const [noticeTone, setNoticeTone] = useState('')
    const playerRef = useRef('')

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError('')
        const requested = playerRef.current
        const params = { months }
        if (requested) params.player = requested
        api.get('/api/reports/precision', { params })
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
                    setError('No se pudo cargar la precisión.')
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
        setNotice('')
        setNoticeTone('')
        setRequestId((current) => current + 1)
    }

    const calculate = () => {
        setCalculating(true)
        setNotice('')
        setNoticeTone('')
        const params = { months }
        if (playerRef.current) params.player = playerRef.current
        api.post('/api/reports/precision/calculate', null, { params })
            .then((response) => {
                const status = response.data?.status
                if (status === 'already_running') {
                    setNoticeTone('ok')
                    setNotice('Ya hay un cálculo de precisión en curso. El aviso aparece en las notificaciones.')
                    return
                }
                if (status === 'empty') {
                    setNoticeTone('')
                    setNotice('No hay partidas pendientes de precisión.')
                    return
                }
                setNoticeTone('ok')
                setNotice('El cálculo sigue en segundo plano. El aviso aparece en las notificaciones.')
            })
            .catch(() => {
                setNoticeTone('error')
                setNotice('No se pudo iniciar el cálculo de precisión.')
            })
            .finally(() => setCalculating(false))
    }

    if (loading) {
        return <Typography color="text.secondary">Cargando la precisión…</Typography>
    }
    if (error) {
        return <Typography color="error">{error}</Typography>
    }
    return (
        <PrecisionReportView
            report={report}
            data={data}
            months={months}
            onMonthsChange={setMonths}
            player={player}
            onPlayerChange={choosePlayer}
            onCalculate={calculate}
            calculating={calculating}
            notice={notice}
            noticeTone={noticeTone}
        />
    )
}
