import React, { useMemo } from 'react'
import { Box, Paper, Tooltip, Typography, useTheme } from '@mui/material'
import {
    chartPointMoverColor,
    chartYFromCp,
    chartYGridTickCpValues,
    computeChartCpSpan,
    formatChartYGridLabel,
    selectMoveNumberAxisTicks,
} from '../../utils/coachEvalCpSeries.js'

const VIEW_W = 400
const CHART_H = 132
const AXIS_H = 18
const LABEL_W = 22
const VIEW_H = CHART_H + AXIS_H
const PAD = 6
const PLOT_X0 = PAD + LABEL_W

/** Lucas Chess–style segment colors */
const SEGMENT_WHITE = '#6fa8dc'
const SEGMENT_BLACK = '#c4a574'

function buildChartLayout(series) {
    /** @type {{ x1: number, y1: number, x2: number, y2: number, stroke: string }[]} */
    const edges = []
    /** @type {{ index: number, x: number, y: number, cp: number, path: number[], tooltip: string, mover: 'white' | 'black' | null }[]} */
    const markers = []
    const n = Math.max(series.length - 1, 1)
    const innerW = VIEW_W - PLOT_X0 - PAD
    const midY = PAD + (CHART_H - PAD * 2) / 2
    const halfSpan = (CHART_H - PAD * 2) / 2

    /** @type {{ x: number, y: number, cp: number } | null} */
    let prev = null
    series.forEach((pt, i) => {
        const x = PLOT_X0 + (i / n) * innerW
        if (pt.cp == null) {
            prev = null
            return
        }
        const y = chartYFromCp(pt.cp, midY, halfSpan)
        const mover = chartPointMoverColor(pt.ply ?? i)
        if (prev != null) {
            const stroke =
                chartPointMoverColor(pt.ply ?? i) === 'white' ? SEGMENT_WHITE : SEGMENT_BLACK
            edges.push({ x1: prev.x, y1: prev.y, x2: x, y2: y, stroke })
        }
        prev = { x, y, cp: pt.cp }
        markers.push({
            index: i,
            x,
            y,
            cp: pt.cp,
            path: pt.path ?? [],
            tooltip: pt.tooltip || `${pt.cp > 0 ? '+' : ''}${(pt.cp / 100).toFixed(2)}`,
            mover,
        })
    })

    const yGrid = chartYGridTickCpValues().map((cp) => ({
        cp,
        y: chartYFromCp(cp, midY, halfSpan),
        label: formatChartYGridLabel(cp),
    }))

    const axisTicks = selectMoveNumberAxisTicks(series).map((t) => ({
        ...t,
        x: PLOT_X0 + (t.index / n) * innerW,
        label: String(t.moveNumber),
    }))

    return { edges, midY, innerW, n, markers, axisTicks, yGrid, plotX0: PLOT_X0 }
}

/** FEAT-047: eval cp line chart (escala asinh ±2000, estilo Lucas Chess). */
export default function CoachEvalCpChart({
    series,
    cursorPly = 0,
    onSelectPath,
    ariaLabel = 'Gráfico de evaluación en centipeones',
}) {
    const theme = useTheme()
    const cursorColor = theme.palette.error.main
    const hasAny = series.some((p) => p.cp != null)
    const cpSpan = useMemo(() => computeChartCpSpan(series), [series])
    const { edges, innerW, n, markers, axisTicks, yGrid, plotX0 } = useMemo(
        () => buildChartLayout(series),
        [series],
    )

    const cursorX = useMemo(() => {
        if (!series.length) return null
        const idx = Math.min(Math.max(cursorPly, 0), series.length - 1)
        return plotX0 + (idx / n) * innerW
    }, [series.length, cursorPly, innerW, n, plotX0])

    const handleSvgClick = (event) => {
        if (!onSelectPath || !markers.length) return
        const svg = event.currentTarget
        const pt = svg.createSVGPoint()
        pt.x = event.clientX
        pt.y = event.clientY
        const ctm = svg.getScreenCTM()
        if (!ctm) return
        const local = pt.matrixTransform(ctm.inverse())
        let best = markers[0]
        let bestDist = Math.abs(local.x - best.x)
        for (let i = 1; i < markers.length; i++) {
            const d = Math.abs(local.x - markers[i].x)
            if (d < bestDist) {
                bestDist = d
                best = markers[i]
            }
        }
        onSelectPath(best.path)
    }

    if (!hasAny) {
        return (
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Evaluación (cp)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Activá el análisis liviano para cargar evaluaciones y ver el gráfico.
                </Typography>
            </Paper>
        )
    }

    return (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
                <Typography variant="subtitle2">Evaluación (cp)</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                    + blancas / − negras · escala asinh (Lucas)
                    <br />
                    borde ±{cpSpan} cp · tooltip = eval real
                </Typography>
            </Box>
            <Box
                component="svg"
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                role="img"
                aria-label={ariaLabel}
                onClick={handleSvgClick}
                sx={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    cursor: onSelectPath ? 'pointer' : 'default',
                }}
            >
                {yGrid.map((g) => (
                    <g key={`grid-${g.cp}`}>
                        <line
                            x1={plotX0}
                            y1={g.y}
                            x2={VIEW_W - PAD}
                            y2={g.y}
                            stroke="currentColor"
                            strokeOpacity={g.cp === 0 ? 0.35 : 0.12}
                            strokeWidth={g.cp === 0 ? 1.25 : 1}
                            pointerEvents="none"
                        />
                        <text
                            x={PAD + 2}
                            y={g.y + 3}
                            fontSize={8}
                            fill="currentColor"
                            fillOpacity={0.55}
                            pointerEvents="none"
                        >
                            {g.label}
                        </text>
                    </g>
                ))}
                {edges.map((e, i) => (
                    <line
                        key={`edge-${i}`}
                        x1={e.x1}
                        y1={e.y1}
                        x2={e.x2}
                        y2={e.y2}
                        stroke={e.stroke}
                        strokeWidth={2}
                        strokeLinecap="round"
                        pointerEvents="none"
                    />
                ))}
                {cursorX != null && (
                    <line
                        x1={cursorX}
                        y1={PAD}
                        x2={cursorX}
                        y2={CHART_H - PAD}
                        stroke={cursorColor}
                        strokeOpacity={0.85}
                        strokeWidth={1.5}
                        pointerEvents="none"
                    />
                )}
                {markers.map((m) => (
                    <Tooltip key={m.index} title={m.tooltip} placement="top" arrow>
                        <circle
                            cx={m.x}
                            cy={m.y}
                            r={8}
                            fill="transparent"
                            stroke="none"
                            onClick={(e) => {
                                e.stopPropagation()
                                onSelectPath?.(m.path)
                            }}
                        />
                    </Tooltip>
                ))}
                {markers.map((m) => {
                    const isWhiteMove = m.mover === 'white'
                    const isBlackMove = m.mover === 'black'
                    return (
                        <circle
                            key={`dot-${m.index}`}
                            cx={m.x}
                            cy={m.y}
                            r={3.25}
                            fill={isBlackMove ? '#2d2d2d' : isWhiteMove ? '#ffffff' : cursorColor}
                            stroke={isWhiteMove ? '#2d2d2d' : isBlackMove ? '#2d2d2d' : 'none'}
                            strokeWidth={isWhiteMove ? 1.1 : 0}
                            pointerEvents="none"
                        />
                    )
                })}
                <line
                    x1={plotX0}
                    y1={CHART_H - PAD}
                    x2={VIEW_W - PAD}
                    y2={CHART_H - PAD}
                    stroke="currentColor"
                    strokeOpacity={0.25}
                    strokeWidth={1}
                    pointerEvents="none"
                />
                {axisTicks.map((t) => (
                    <text
                        key={`${t.index}-${t.label}`}
                        x={t.x}
                        y={VIEW_H - 4}
                        textAnchor="middle"
                        fontSize={9}
                        fill="currentColor"
                        fillOpacity={0.65}
                        pointerEvents="none"
                    >
                        {t.label}
                    </text>
                ))}
            </Box>
        </Paper>
    )
}
