import React, { useMemo } from 'react'
import { Box, Paper, Tooltip, Typography, useTheme } from '@mui/material'
import {
    CP_CHART_MAX,
    CP_CHART_MIN,
    selectMoveNumberAxisTicks,
} from '../../utils/coachEvalCpSeries.js'

const VIEW_W = 400
const CHART_H = 112
const AXIS_H = 18
const VIEW_H = CHART_H + AXIS_H
const PAD = 6

function yForCp(cp, midY, halfSpan) {
    return midY - (cp / CP_CHART_MAX) * halfSpan
}

function buildChartLayout(series) {
    /** @type {{ x: number, y: number }[][]} */
    const segments = []
    /** @type {{ index: number, x: number, y: number, cp: number, path: number[], tooltip: string }[]} */
    const markers = []
    let current = []
    const n = Math.max(series.length - 1, 1)
    const innerW = VIEW_W - PAD * 2
    const midY = PAD + (CHART_H - PAD * 2) / 2
    const halfSpan = (CHART_H - PAD * 2) / 2

    series.forEach((pt, i) => {
        const x = PAD + (i / n) * innerW
        if (pt.cp == null) {
            if (current.length > 0) {
                segments.push(current)
                current = []
            }
            return
        }
        const y = yForCp(pt.cp, midY, halfSpan)
        current.push({ x, y })
        markers.push({
            index: i,
            x,
            y,
            cp: pt.cp,
            path: pt.path ?? [],
            tooltip: pt.tooltip || `${pt.cp > 0 ? '+' : ''}${pt.cp} cp`,
        })
    })
    if (current.length > 0) segments.push(current)

    const axisTicks = selectMoveNumberAxisTicks(series).map((t) => ({
        ...t,
        x: PAD + (t.index / n) * innerW,
        label: String(t.moveNumber),
    }))

    return { segments, midY, innerW, n, markers, axisTicks }
}

/** FEAT-047: eval cp line chart (−100…+100, zero at vertical center). */
export default function CoachEvalCpChart({
    series,
    cursorPly = 0,
    onSelectPath,
    ariaLabel = 'Gráfico de evaluación en centipeones',
}) {
    const theme = useTheme()
    const lineColor = theme.palette.error.main
    const hasAny = series.some((p) => p.cp != null)
    const { segments, midY, innerW, n, markers, axisTicks } = useMemo(
        () => buildChartLayout(series),
        [series],
    )

    const cursorX = useMemo(() => {
        if (!series.length) return null
        const idx = Math.min(Math.max(cursorPly, 0), series.length - 1)
        return PAD + (idx / n) * innerW
    }, [series.length, cursorPly, innerW, n])

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
                <Typography variant="caption" color="text.secondary">
                    {CP_CHART_MIN} … 0 … +{CP_CHART_MAX}
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
                <line
                    x1={PAD}
                    y1={midY}
                    x2={VIEW_W - PAD}
                    y2={midY}
                    stroke="currentColor"
                    strokeOpacity={0.2}
                    strokeWidth={1}
                />
                {segments.map((seg, i) => (
                    <polyline
                        key={i}
                        fill="none"
                        stroke={lineColor}
                        strokeWidth={1.75}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        pointerEvents="none"
                        points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                ))}
                {cursorX != null && (
                    <line
                        x1={cursorX}
                        y1={PAD}
                        x2={cursorX}
                        y2={CHART_H - PAD}
                        stroke={lineColor}
                        strokeOpacity={0.45}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        pointerEvents="none"
                    />
                )}
                {markers.map((m) => (
                    <Tooltip key={m.index} title={m.tooltip} placement="top" arrow>
                        <circle
                            cx={m.x}
                            cy={m.y}
                            r={7}
                            fill={lineColor}
                            fillOpacity={0.001}
                            stroke="none"
                            onClick={(e) => {
                                e.stopPropagation()
                                onSelectPath?.(m.path)
                            }}
                        />
                    </Tooltip>
                ))}
                {markers.map((m) => (
                    <circle
                        key={`dot-${m.index}`}
                        cx={m.x}
                        cy={m.y}
                        r={2.5}
                        fill={lineColor}
                        pointerEvents="none"
                    />
                ))}
                <line
                    x1={PAD}
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
