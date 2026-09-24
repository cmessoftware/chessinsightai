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
import { ingestAndAnalyze } from '../services/module07Service.js'

export default function CoachImportPage() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [pgn, setPgn] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [info, setInfo] = useState(null)

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError(null)
        setInfo(null)
        setLoading(true)
        try {
            const result = await ingestAndAnalyze(pgn, username.trim())
            setInfo(
                `Importadas ${result.games?.length ?? 0} partida(s). Job ${result.job?.id} (${result.job?.status}).`
            )
            navigate('/coach/jobs')
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
                Tu usuario debe coincidir con [White] o [Black] en cada partida del PGN.
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {String(error)}
                </Alert>
            )}
            {info && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {info}
                </Alert>
            )}
            <Box component="form" onSubmit={handleSubmit}>
                <TextField
                    fullWidth
                    label="Tu username (Lichess / Chess.com)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    sx={{ mb: 2 }}
                />
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
                    {loading ? 'Enviando…' : 'Importar y analizar'}
                </Button>
            </Box>
        </Paper>
    )
}
