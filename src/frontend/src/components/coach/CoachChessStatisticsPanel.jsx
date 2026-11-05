import React, { useEffect, useState } from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    CircularProgress,
    Typography,
} from '@mui/material'
import {
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

/** FEAT-093: collapsible chess_statistics result under the PGN panel. */
export default function CoachChessStatisticsPanel({ gameId }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [payload, setPayload] = useState(null)

    useEffect(() => {
        if (!gameId) {
            setPayload(null)
            setError('')
            setLoading(false)
            return undefined
        }
        let cancel = false
        setLoading(true)
        setError('')
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
                <Typography variant="subtitle2">Estadísticas</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>{body}</AccordionDetails>
        </Accordion>
    )
}
