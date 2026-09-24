import React, { useCallback, useMemo, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material'
import { CloudUpload, FileUpload } from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { ingestAndAnalyze } from '../services/module07Service.js'

const ADMIN_CORPUS = [
    { value: 'personal', label: 'Personal' },
    { value: 'elite', label: 'Elite' },
    { value: 'fide', label: 'FIDE' },
    { value: 'novice', label: 'Novice' },
    { value: 'stockfish', label: 'Stockfish' },
]

const USER_CORPUS = [{ value: 'personal', label: 'Personal' }]

async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file)
    })
}

function PgnImportPanel({ corpusType, onCorpusChange, corpusOptions, isAdmin }) {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [pgn, setPgn] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const submitPgn = async (text) => {
        const trimmed = text.trim()
        if (!trimmed) {
            setError('El PGN está vacío.')
            return
        }
        setError(null)
        setLoading(true)
        try {
            const result = await ingestAndAnalyze(trimmed, username.trim(), {
                corpusType,
                source: 'pgn_upload',
            })
            navigate('/coach/jobs', {
                state: {
                    message: `Importadas ${result.games?.length ?? 0} partida(s). Job ${result.job?.id}.`,
                },
            })
        } catch (err) {
            setError(err.response?.data?.detail || err.message || 'Error al importar')
        } finally {
            setLoading(false)
        }
    }

    const onDrop = useCallback(async (accepted) => {
        if (!accepted.length) return
        try {
            const text = await readFileAsText(accepted[0])
            setPgn(text)
        } catch (e) {
            setError(String(e))
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/x-chess-pgn': ['.pgn'], 'text/plain': ['.pgn', '.txt'] },
        multiple: false,
        noClick: true,
        noKeyboard: true,
    })

    const handleFilePick = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        const text = await readFileAsText(file)
        setPgn(text)
    }

    return (
        <Box {...getRootProps()} sx={{ outline: 'none' }}>
            <input {...getInputProps()} />
            {isDragActive && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Suelta el archivo .pgn aquí…
                </Alert>
            )}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {String(error)}
                </Alert>
            )}
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="corpus-label">Tipo de corpus</InputLabel>
                <Select
                    labelId="corpus-label"
                    value={corpusType}
                    label="Tipo de corpus"
                    onChange={(e) => onCorpusChange(e.target.value)}
                >
                    {corpusOptions.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                            {o.label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            {!isAdmin && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Solo administradores pueden importar corpus elite, FIDE, novice o Stockfish.
                </Typography>
            )}
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
                label="PGN (pegar texto o cargar archivo abajo)"
                value={pgn}
                onChange={(e) => setPgn(e.target.value)}
                required
                multiline
                minRows={10}
                sx={{ mb: 2, fontFamily: 'monospace' }}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Button variant="outlined" component="label" startIcon={<FileUpload />}>
                    Elegir archivo .pgn
                    <input type="file" hidden accept=".pgn,.txt" onChange={handleFilePick} />
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    o arrastra un .pgn a esta página
                </Typography>
            </Box>
            <Button
                variant="contained"
                startIcon={<CloudUpload />}
                disabled={loading}
                onClick={() => submitPgn(pgn)}
            >
                {loading ? 'Enviando…' : 'Importar y analizar (Coach)'}
            </Button>
        </Box>
    )
}

export default function UnifiedImportPage() {
    const { user } = useAuth()
    const isAdmin = user?.roles?.includes('admin')
    const corpusOptions = useMemo(() => (isAdmin ? ADMIN_CORPUS : USER_CORPUS), [isAdmin])
    const [tab, setTab] = useState(0)
    const [corpusType, setCorpusType] = useState('personal')

    return (
        <Paper sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
            <Typography variant="h5" gutterBottom>
                Importar partidas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Hub unificado (UI-107): PGN → cola de análisis Coach. El username debe coincidir con
                [White] o [Black] en cada partida.
            </Typography>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab label="PGN" />
                <Tab label="Chess.com" disabled />
                <Tab label="Lichess" disabled />
            </Tabs>
            {tab === 0 && (
                <PgnImportPanel
                    corpusType={corpusType}
                    onCorpusChange={setCorpusType}
                    corpusOptions={corpusOptions}
                    isAdmin={isAdmin}
                />
            )}
            {tab === 1 && (
                <Alert severity="info">Sincronización Chess.com — UI-105 (próximamente).</Alert>
            )}
            {tab === 2 && (
                <Alert severity="info">Sincronización Lichess — UI-106 (próximamente).</Alert>
            )}
            <Alert severity="warning" sx={{ mt: 3 }}>
                Importación legacy (features ML) sigue en{' '}
                <strong>/import/legacy</strong> hasta unificar pipelines.
            </Alert>
        </Paper>
    )
}
