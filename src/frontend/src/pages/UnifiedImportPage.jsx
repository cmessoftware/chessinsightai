import React, { useCallback, useMemo, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Chip,
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
import { ingestPgn } from '../services/module07Service.js'

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

function SiteSyncPlaceholder({ siteLabel }) {
    return (
        <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
                Sincronización {siteLabel} — próximamente (UI-105 / UI-106).
            </Alert>
            <Typography variant="body2" color="text.secondary">
                Filtros: usuario del sitio, desde fecha, tipo de partida (daily, classical, rapid,
                blitz, bullet). El usuario del sitio no es el login de sesión (7.6).
            </Typography>
        </Box>
    )
}

function PgnImportPanel({ corpusType, onCorpusChange, corpusOptions, isAdmin }) {
    const navigate = useNavigate()
    const [pgnPaste, setPgnPaste] = useState('')
    const [pgnFile, setPgnFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const resolvePgnText = async () => {
        const pasted = pgnPaste.trim()
        if (pgnFile) {
            return readFileAsText(pgnFile)
        }
        return pasted
    }

    const submitImport = async () => {
        if (!pgnPaste.trim() && !pgnFile) {
            setError('Pegá un PGN o elegí un archivo .pgn.')
            return
        }
        setError(null)
        setLoading(true)
        try {
            const text = (await resolvePgnText()).trim()
            if (!text) {
                setError('El PGN está vacío.')
                return
            }
            const result = await ingestPgn(text, {
                corpusType,
                source: 'pgn_upload',
            })
            setPgnPaste('')
            setPgnFile(null)
            navigate('/coach/jobs', {
                state: {
                    message: `Importadas ${result.count ?? result.games?.length ?? 0} partida(s). Elegí jugador y analizá desde la cola.`,
                },
            })
        } catch (err) {
            const detail = err.response?.data?.detail
            setError(
                typeof detail === 'string'
                    ? detail
                    : err.message || 'Error al importar'
            )
        } finally {
            setLoading(false)
        }
    }

    const onDrop = useCallback((accepted) => {
        if (!accepted.length) return
        setPgnFile(accepted[0])
        setError(null)
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/x-chess-pgn': ['.pgn'], 'text/plain': ['.pgn', '.txt'] },
        multiple: false,
        noClick: true,
        noKeyboard: true,
    })

    const handleFilePick = (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        setPgnFile(file)
        setError(null)
        event.target.value = ''
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
            <Alert severity="info" sx={{ mb: 2 }}>
                Solo importamos partidas aquí. El jugador a analizar ([White] / [Black] u otro handle)
                se elige al encolar el análisis, de a una o en lote.
            </Alert>
            <TextField
                fullWidth
                label="PGN (pegar texto, opcional si usás archivo)"
                value={pgnPaste}
                onChange={(e) => setPgnPaste(e.target.value)}
                multiline
                minRows={6}
                sx={{ mb: 2, fontFamily: 'monospace' }}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                <Button variant="outlined" component="label" startIcon={<FileUpload />}>
                    Elegir archivo .pgn
                    <input type="file" hidden accept=".pgn,.txt" onChange={handleFilePick} />
                </Button>
                {pgnFile && (
                    <Chip
                        label={pgnFile.name}
                        onDelete={() => setPgnFile(null)}
                        variant="outlined"
                    />
                )}
                <Typography variant="body2" color="text.secondary">
                    o arrastra un .pgn a esta página (no se muestra el contenido en el cuadro de
                    texto)
                </Typography>
            </Box>
            <Button
                variant="contained"
                startIcon={<CloudUpload />}
                disabled={loading}
                onClick={() => submitImport()}
            >
                {loading ? 'Importando…' : 'Importar partidas'}
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
                PGN → biblioteca Coach. El análisis se configura en Coach → Cola.
            </Typography>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab label="PGN" />
                <Tab label="Chess.com" />
                <Tab label="Lichess" />
            </Tabs>
            {tab === 0 && (
                <PgnImportPanel
                    corpusType={corpusType}
                    onCorpusChange={setCorpusType}
                    corpusOptions={corpusOptions}
                    isAdmin={isAdmin}
                />
            )}
            {tab === 1 && <SiteSyncPlaceholder siteLabel="Chess.com" />}
            {tab === 2 && <SiteSyncPlaceholder siteLabel="Lichess" />}
            <Alert severity="warning" sx={{ mt: 3 }}>
                Importación legacy (features ML) en <strong>/import/legacy</strong>.
            </Alert>
        </Paper>
    )
}
