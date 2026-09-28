import React, { useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Paper,
    TextField,
    Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ingestPgn } from '../services/module07Service.js'

export default function CoachImportPage() {
    const navigate = useNavigate()
    const [pgn, setPgn] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError(null)
        setLoading(true)
        try {
            const result = await ingestPgn(pgn)
            navigate('/coach/jobs', {
                state: {
                    message: `Importadas ${result.count ?? 0} partida(s). Configurá el análisis en la cola.`,
                },
            })
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Error al importar')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Paper sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
            <Typography variant="h5" gutterBottom>
                Coach — Importar PGN
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Solo importación. El jugador a analizar se elige en Coach → Cola.
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {String(error)}
                </Alert>
            )}
            <Box component="form" onSubmit={handleSubmit}>
                <TextField
                    fullWidth
                    label="PGN (texto o varias partidas)"
                    value={pgn}
                    onChange={(e) => setPgn(e.target.value)}
                    required
                    multiline
                    minRows={12}
                    sx={{ mb: 2, fontFamily: 'monospace' }}
                />
                <Button type="submit" variant="contained" disabled={loading}>
                    {loading ? 'Importando…' : 'Importar partidas'}
                </Button>
            </Box>
        </Paper>
    )
}
