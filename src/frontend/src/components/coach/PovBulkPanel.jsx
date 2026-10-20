import React, { useCallback, useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    TextField,
    Typography,
} from '@mui/material'
import { RestartAlt, SwapHoriz } from '@mui/icons-material'
import {
    applyPovBulk,
    getPovBulkStatus,
    parseApiDetail,
    rollbackPovBulk,
} from '../../services/module07Service.js'

const noLoginAutofillSx = {
    '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
        WebkitBoxShadow: '0 0 0 100px rgb(255, 255, 255) inset',
        WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
        caretColor: 'rgba(0, 0, 0, 0.87)',
        transition: 'background-color 99999s ease-out 0s',
    },
}

export default function PovBulkPanel() {
    const [source, setSource] = useState('')
    const [target, setTarget] = useState('')
    const [status, setStatus] = useState(null)
    const [message, setMessage] = useState(null)
    const [error, setError] = useState(null)
    const [busy, setBusy] = useState(false)

    const refreshStatus = useCallback(async () => {
        try {
            const data = await getPovBulkStatus()
            setStatus(data)
        } catch (err) {
            setError(parseApiDetail(err))
        }
    }, [])

    useEffect(() => {
        refreshStatus()
    }, [refreshStatus])

    const handleApply = async () => {
        setError(null)
        setMessage(null)
        setBusy(true)
        try {
            const result = await applyPovBulk({
                source_username: source.trim(),
                target_username: target.trim(),
            })
            setStatus(result.status || null)
            setMessage(
                `Actualizadas ${result.updated} partida(s); omitidas ${result.skipped}. Podés deshacer mientras no importes de nuevo con otro alias.`
            )
        } catch (err) {
            setError(parseApiDetail(err))
        } finally {
            setBusy(false)
        }
    }

    const handleRollback = async () => {
        setError(null)
        setMessage(null)
        setBusy(true)
        try {
            const result = await rollbackPovBulk()
            setStatus(result.status || null)
            setMessage(`Restauradas ${result.updated} partida(s) al PGN y POV anteriores.`)
        } catch (err) {
            setError(parseApiDetail(err))
        } finally {
            setBusy(false)
        }
    }

    const rollbackCount = status?.rollback_available_count ?? 0
    const lastApply = status?.last_apply

    return (
        <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Reemplazá un nombre de jugador en los encabezados <strong>[White]</strong> /{' '}
                <strong>[Black]</strong> de todas tus partidas de la biblioteca Coach. El
                identificador interno de cada partida no cambia; se guarda una copia para{' '}
                <strong>Deshacer</strong> (rollback).
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {message && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage(null)}>
                    {message}
                </Alert>
            )}
            {lastApply?.source && lastApply?.target && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Último cambio: {lastApply.source} → {lastApply.target}
                    {lastApply.applied_at ? ` (${lastApply.applied_at})` : ''}. Partidas con
                    rollback: {rollbackCount}.
                </Typography>
            )}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 2,
                    mb: 2,
                    maxWidth: 720,
                }}
            >
                <TextField
                    label="Usuario en PGN (origen)"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    fullWidth
                    size="small"
                    sx={noLoginAutofillSx}
                    autoComplete="off"
                    helperText="Ej. tu login Chess.com/Lichess tal como figura hoy en las partidas"
                />
                <TextField
                    label="Alias POV (destino)"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    fullWidth
                    size="small"
                    sx={noLoginAutofillSx}
                    autoComplete="off"
                    helperText="Nombre unificado para analizar y filtrar en Partidas"
                />
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Button
                    variant="contained"
                    startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <SwapHoriz />}
                    onClick={handleApply}
                    disabled={busy || !source.trim() || !target.trim()}
                >
                    Aplicar en todas las partidas
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<RestartAlt />}
                    onClick={handleRollback}
                    disabled={busy || rollbackCount < 1}
                >
                    Deshacer ({rollbackCount})
                </Button>
            </Box>
        </Box>
    )
}
