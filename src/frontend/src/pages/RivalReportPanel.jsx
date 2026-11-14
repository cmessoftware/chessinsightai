import { useEffect, useRef, useState } from 'react'
import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material'
import api from '../services/api.js'
import { chartLayout, defaultSpeedClass, formatRating, formatReportDate } from '../reports/rankingReport.js'
import { formatPrecision } from '../reports/precisionReport.js'
import { rivalCharts, rivalParagraphs } from '../reports/rivalReport.js'
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

const PLAYER_BLUE = '#1565c0'
const RIVAL_RED = '#d32f2f'

function OverlayChart({ mine, rival, mineName, rivalName, label, caption, formatValue }) {
    const mineReady = (mine || []).length >= 2
    const rivalReady = (rival || []).length >= 2
    const layout = chartLayout(mineReady ? mine : rival, mineReady ? rival : null)
    if (!layout) {
        return (
            <Typography variant="body2" color="text.secondary">
                Hace falta más de una partida para el gráfico.
            </Typography>
        )
    }
    const draw = (points, color, keyPrefix) => (
        <>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points.map((point) => `${point.x},${point.y}`).join(' ')}
            />
            {points.map((point) => (
                <circle key={`${keyPrefix}-${point.date}-${point.x}`} cx={point.x} cy={point.y} r="6" fill={color}>
                    <title>{`${keyPrefix} · ${formatReportDate(point.date)} · ${formatValue(point.rating)}`}</title>
                </circle>
            ))}
        </>
    )
    return (
        <Box sx={{ mt: 1 }}>
            <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={label} width="100%">
                <line x1={layout.axis.left} y1={layout.axis.top} x2={layout.axis.left} y2={layout.axis.bottom} stroke="#212121" />
                <line x1={layout.axis.left} y1={layout.axis.bottom} x2={layout.axis.right} y2={layout.axis.bottom} stroke="#212121" />
                {layout.yTicks.map((tick) => (
                    <text key={`y-${tick.rating}-${tick.y}`} x={layout.axis.left - 6} y={tick.y + 4} textAnchor="end" fontSize="11" fill="#212121">
                        {formatValue(tick.rating)}
                    </text>
                ))}
                {layout.xTicks.map((tick) => (
                    <text key={`x-${tick.label}-${tick.x}`} x={tick.x} y={layout.axis.bottom + 18} textAnchor="middle" fontSize="11" fill="#212121">
                        {tick.label}
                    </text>
                ))}
                {mineReady ? draw(layout.points, PLAYER_BLUE, mineName) : null}
                {rivalReady ? draw(mineReady ? layout.comparison : layout.points, RIVAL_RED, rivalName) : null}
            </svg>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                {mineReady ? <Typography variant="caption" sx={{ color: PLAYER_BLUE }}>{mineName}</Typography> : null}
                {rivalReady ? <Typography variant="caption" sx={{ color: RIVAL_RED }}>{rivalName}</Typography> : null}
            </Box>
            <Typography variant="caption" color="text.secondary">
                {caption}
            </Typography>
        </Box>
    )
}

function RhythmBlock({ rhythm, player, rival }) {
    const ranking = rhythm.ranking
    const precision = rhythm.precision
    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6">{rhythm.label}</Typography>
            {ranking ? (
                <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle1">
                        Ranking de {rival} · {ranking.games} {ranking.games === 1 ? 'partida' : 'partidas'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1 }}>
                        {[
                            ['Mínimo', ranking.minimum],
                            ['Promedio', ranking.average],
                            ['Máximo', ranking.maximum],
                        ].map(([label, value]) => (
                            <Box key={label}>
                                <Typography variant="overline">{label}</Typography>
                                <Typography variant="h5">{formatRating(value.rating)}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {formatReportDate(value.date)}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                    <OverlayChart
                        mine={ranking.mine_series}
                        rival={ranking.rival_series?.length ? ranking.rival_series : ranking.series}
                        mineName={player}
                        rivalName={rival}
                        label={`Ranking de ${player} y ${rival}`}
                        caption="Azul es el jugador y rojo el rival. Pasá el mouse sobre un punto para ver la fecha y el ranking."
                        formatValue={formatRating}
                    />
                </Box>
            ) : null}
            {precision ? (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1">Precisión de {rival}</Typography>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1 }}>
                        {PHASES.map(([key, label]) => (
                            <Box key={key}>
                                <Typography variant="overline">{label}</Typography>
                                <Typography variant="h5">{formatPrecision(precision[key]?.mean)}</Typography>
                            </Box>
                        ))}
                    </Box>
                    <OverlayChart
                        mine={precision.mine_series}
                        rival={precision.rival_series?.length ? precision.rival_series : precision.series}
                        mineName={player}
                        rivalName={rival}
                        label={`Precisión de ${player} y ${rival}`}
                        caption="Azul es el jugador y rojo el rival. Pasá el mouse sobre un punto para ver la fecha y la precisión."
                        formatValue={formatPrecision}
                    />
                </Box>
            ) : null}
        </Box>
    )
}

export function RivalReportView({
    report,
    data,
    months,
    onMonthsChange,
    player,
    onPlayerChange,
    rival,
    onRivalChange,
}) {
    const rhythms = data?.rhythms || []
    const [speed, setSpeed] = useState(() => defaultSpeedClass(rhythms))
    const [format, setFormat] = useState('markdown')
    const [downloaded, setDownloaded] = useState('')
    const selected = rhythms.find((rhythm) => rhythm.speed_class === speed) || rhythms[0] || null
    const paragraphs = rivalParagraphs(data, selected?.speed_class)
    const charts = rivalCharts(data, selected?.speed_class)

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
                        <InputLabel id="rival-player-label">Jugador</InputLabel>
                        <Select
                            labelId="rival-player-label"
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
                {(data?.rivals || []).length > 0 ? (
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel id="rival-name-label">Rival</InputLabel>
                        <Select
                            labelId="rival-name-label"
                            label="Rival"
                            value={rival || data.rival || ''}
                            onChange={(event) => onRivalChange(event.target.value)}
                        >
                            {data.rivals.map((name) => (
                                <MenuItem key={name} value={name}>
                                    {name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : null}
                <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel id="rival-period-label">Período</InputLabel>
                    <Select
                        labelId="rival-period-label"
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
                        <InputLabel id="rival-speed-label">Ritmo</InputLabel>
                        <Select
                            labelId="rival-speed-label"
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
                    {exportControls('rival-format-top')}
                    <Typography color="text.secondary" sx={{ mt: 2 }}>
                        {data.rival
                            ? `${data.rival} contra ${data.player}, ${formatReportDate(data.from)} a ${formatReportDate(data.to)}`
                            : 'No hay rivales en las partidas de este jugador.'}
                    </Typography>
                    {selected ? (
                        <RhythmBlock rhythm={selected} player={data.player} rival={data.rival} />
                    ) : (
                        <Typography sx={{ mt: 2 }}>No hay partidas contra este rival en este período.</Typography>
                    )}
                    {exportControls('rival-format-bottom')}
                </>
            ) : null}
        </Box>
    )
}

export default function RivalReportPanel({ report }) {
    const [months, setMonths] = useState(12)
    const [player, setPlayer] = useState('')
    const [rival, setRival] = useState('')
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [requestId, setRequestId] = useState(0)
    const playerRef = useRef('')
    const rivalRef = useRef('')

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError('')
        const params = { months }
        if (playerRef.current) params.player = playerRef.current
        if (rivalRef.current) params.rival = rivalRef.current
        api.get('/api/reports/rival', { params })
            .then((response) => {
                if (cancelled) return
                setData(response.data)
                const resolvedPlayer = response.data?.player || ''
                const resolvedRival = response.data?.rival || ''
                if (!playerRef.current && resolvedPlayer) {
                    playerRef.current = resolvedPlayer
                    setPlayer(resolvedPlayer)
                }
                if (!rivalRef.current && resolvedRival) {
                    rivalRef.current = resolvedRival
                    setRival(resolvedRival)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setData(null)
                    setError('No se pudo cargar la comparación.')
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
        rivalRef.current = ''
        setPlayer(name)
        setRival('')
        setRequestId((current) => current + 1)
    }

    const chooseRival = (name) => {
        rivalRef.current = name
        setRival(name)
        setRequestId((current) => current + 1)
    }

    if (loading) {
        return <Typography color="text.secondary">Cargando la comparación…</Typography>
    }
    if (error) {
        return <Typography color="error">{error}</Typography>
    }
    return (
        <RivalReportView
            report={report}
            data={data}
            months={months}
            onMonthsChange={setMonths}
            player={player}
            onPlayerChange={choosePlayer}
            rival={rival}
            onRivalChange={chooseRival}
        />
    )
}
