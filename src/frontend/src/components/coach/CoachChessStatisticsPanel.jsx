import React, { useEffect, useRef, useState } from 'react'
import CalculateIcon from '@mui/icons-material/Calculate'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    CircularProgress,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material'
import {
    calculateCoachGameChessStatistics,
    getCoachGameChessStatistics,
    parseApiDetail,
} from '../../services/module07Service.js'

const accordionSx = {
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    mt: 1,
    '&:before': { display: 'none' },
    boxShadow: 'none',
}

const SHARED_KEYS = new Set(['resultado', 'ritmo', 'fuente_evaluacion'])

const cellSx = { py: 0.4, px: 0.75, borderBottomColor: 'divider' }

function sideLabel(caption, name, emphasize) {
    return (
        <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" display="block">
                {caption}
            </Typography>
            {name && name !== caption ? (
                <Typography variant="body2" sx={{ fontWeight: emphasize ? 700 : 600, lineHeight: 1.2 }}>
                    {name}
                </Typography>
            ) : null}
        </Box>
    )
}

function ComparisonTable({ comparison }) {
    const pov = comparison.point_of_view
    return (
        <Table size="small" aria-label="Comparación de estadísticas">
            <TableHead>
                <TableRow>
                    <TableCell sx={cellSx} />
                    <TableCell align="right" sx={cellSx}>
                        {sideLabel('Blancas', comparison.white_name, pov === 'white')}
                    </TableCell>
                    <TableCell align="right" sx={cellSx}>
                        {sideLabel('Negras', comparison.black_name, pov === 'black')}
                    </TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {comparison.rows.map((row) => (
                    <TableRow key={row.key}>
                        <TableCell sx={cellSx}>
                            <Typography variant="body2" color="text.secondary">
                                {row.label}
                            </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ ...cellSx, fontWeight: pov === 'white' ? 700 : 600 }}>
                            {row.white ?? '—'}
                        </TableCell>
                        <TableCell align="right" sx={{ ...cellSx, fontWeight: pov === 'black' ? 700 : 600 }}>
                            {row.black ?? '—'}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

/** FEAT-093: collapsible chess_statistics result under the PGN panel. */
export default function CoachChessStatisticsPanel({ gameId }) {
    const [loading, setLoading] = useState(false)
    const [calculating, setCalculating] = useState(false)
    const [error, setError] = useState('')
    const [calcError, setCalcError] = useState('')
    const [payload, setPayload] = useState(null)
    const gameIdRef = useRef(gameId)
    gameIdRef.current = gameId

    const calculate = () => {
        if (!gameId || calculating) return
        const requested = gameId
        setCalculating(true)
        setCalcError('')
        calculateCoachGameChessStatistics(requested)
            .then((data) => {
                if (gameIdRef.current === requested) setPayload(data)
            })
            .catch((err) => {
                if (gameIdRef.current === requested) setCalcError(parseApiDetail(err))
            })
            .finally(() => {
                if (gameIdRef.current === requested) setCalculating(false)
            })
    }

    useEffect(() => {
        if (!gameId) {
            setPayload(null)
            setError('')
            setCalcError('')
            setCalculating(false)
            setLoading(false)
            return undefined
        }
        let cancel = false
        setLoading(true)
        setError('')
        setCalcError('')
        getCoachGameChessStatistics(gameId)
            .then((data) => {
                if (!cancel) setPayload(data)
            })
            .catch((err) => {
                if (!cancel) setError(parseApiDetail(err))
            })
            .finally(() => {
                if (!cancel) setLoading(false)
            })
        return () => {
            cancel = true
        }
    }, [gameId])

    let body = null
    if (!gameId) {
        body = (
            <Typography variant="body2" color="text.secondary">
                Guardá la partida para ver el resultado de chess_statistics.
            </Typography>
        )
    } else if (loading) {
        body = <CircularProgress size={18} />
    } else if (error) {
        body = (
            <Typography variant="body2" color="error">
                {error}
            </Typography>
        )
    } else if (payload && !payload.available) {
        body = (
            <Typography variant="body2" color="text.secondary">
                No hay una base de chess_statistics en este entorno.
            </Typography>
        )
    } else if (payload && !payload.found) {
        body = (
            <Typography variant="body2" color="text.secondary">
                Esta partida todavía no tiene estadísticas.
            </Typography>
        )
    } else if (payload?.comparison?.rows?.length) {
        const shared = (payload.fields || []).filter((field) => SHARED_KEYS.has(field.key))
        body = (
            <Box>
                {shared.length ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 2, rowGap: 0.5, mb: 1 }}>
                        {shared.map((field) => (
                            <React.Fragment key={field.key}>
                                <Typography variant="body2" color="text.secondary">
                                    {field.label}
                                </Typography>
                                <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 600 }}>
                                    {field.value}
                                </Typography>
                            </React.Fragment>
                        ))}
                    </Box>
                ) : null}
                <ComparisonTable comparison={payload.comparison} />
            </Box>
        )
    } else if (payload?.fields?.length) {
        body = (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 2, rowGap: 0.5 }}>
                {payload.fields.map((field) => (
                    <React.Fragment key={field.key}>
                        <Typography variant="body2" color="text.secondary">
                            {field.label}
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 600 }}>
                            {field.value}
                        </Typography>
                    </React.Fragment>
                ))}
            </Box>
        )
    }

    return (
        <Accordion disableGutters sx={accordionSx}>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="coach-chess-statistics-content"
                id="coach-chess-statistics-header"
            >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 1 }}>
                    <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                        Estadísticas
                    </Typography>
                    {gameId ? (
                        <Tooltip title={payload?.found ? 'Recalcular estadísticas' : 'Calcular estadísticas'}>
                            <span>
                                <IconButton
                                    size="small"
                                    aria-label={payload?.found ? 'Recalcular estadísticas' : 'Calcular estadísticas'}
                                    disabled={loading || calculating}
                                    onMouseDown={(event) => event.stopPropagation()}
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        calculate()
                                    }}
                                >
                                    {calculating ? <CircularProgress size={18} /> : <CalculateIcon fontSize="small" />}
                                </IconButton>
                            </span>
                        </Tooltip>
                    ) : null}
                </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
                {body}
                {calcError ? (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                        {calcError}
                    </Typography>
                ) : null}
            </AccordionDetails>
        </Accordion>
    )
}
