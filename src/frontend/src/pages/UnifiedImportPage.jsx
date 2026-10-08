import React, { useCallback, useMemo, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    InputLabel,
    Link,
    MenuItem,
    Paper,
    Select,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material'
import { CloudUpload, InfoOutlined } from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sincronización {siteLabel} — próximamente (UI-105 / UI-106).
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Filtros: usuario del sitio, desde fecha, tipo de partida (daily, classical, rapid,
                blitz, bullet).
            </Typography>
        </Box>
    )
}

function PgnImportPanel({ corpusType, onCorpusChange, corpusOptions }) {
    const navigate = useNavigate()
    const [pgnPaste, setPgnPaste] = useState('')
    const [pgnFile, setPgnFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [goToQueueAfter, setGoToQueueAfter] = useState(true)

    const resolvePgnText = async () => {
        if (pgnFile) {
            return readFileAsText(pgnFile)
        }
        return pgnPaste.trim()
    }

    const submitImport = async () => {
        if (!pgnPaste.trim() && !pgnFile) {
            setError('Pegá un PGN en el cuadro o elegí un archivo .pgn.')
            return
        }
        setError(null)
        setSuccess(null)
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
            const imported = result.games || []
            const count = result.count ?? imported.length
            const newCount = result.new_count ?? imported.filter((g) => g.is_new).length
            const dupCount = count - newCount
            setPgnPaste('')
            setPgnFile(null)

            if (count === 1 && imported[0]?.id) {
                const g = imported[0]
                navigate(`/coach/games/${g.id}/analysis`, {
                    state: {
                        message: g.is_new
                            ? 'Partida importada. Revisá jugadas o encolá Stockfish en la Cola.'
                            : 'Esta partida ya estaba en la biblioteca; actualizada y abierta.',
                    },
                })
                return
            }

            if (goToQueueAfter) {
                const dupNote =
                    dupCount > 0 ? ` ${dupCount} ya existían (resaltadas).` : ''
                navigate('/coach/jobs', {
                    state: {
                        message: `${newCount} nueva(s), ${count} en total.${dupNote} Elegí jugador y encolá análisis.`,
                        highlightGameIds: imported.map((g) => g.id),
                        importedGames: imported.map((g) => ({
                            id: g.id,
                            is_new: Boolean(g.is_new),
                        })),
                    },
                })
            } else {
                setSuccess(
                    `Importadas ${count} partida(s) (${newCount} nueva(s)). Podés verlas en la Cola.`
                )
            }
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
                    Soltá el archivo .pgn aquí…
                </Alert>
            )}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {String(error)}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}{' '}
                    <Link component={RouterLink} to="/coach/jobs">
                        Ir a Cola Coach
                    </Link>
                </Alert>
            )}

            {corpusOptions.length > 1 && (
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
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
            )}

            <Typography
                component="label"
                htmlFor="pgn-paste"
                variant="subtitle1"
                sx={{ display: 'block', fontWeight: 600, mb: 1 }}
            >
                Pega el texto PGN aquí
            </Typography>
            <TextField
                id="pgn-paste"
                fullWidth
                multiline
                minRows={12}
                placeholder={'[Event "?"]\n[White "..."]\n[Black "..."]\n\n1. e4 e5 ...'}
                value={pgnPaste}
                onChange={(e) => setPgnPaste(e.target.value)}
                disabled={Boolean(pgnFile)}
                helperText={
                    pgnFile
                        ? 'Hay un archivo seleccionado: se importará el archivo (no el texto del cuadro).'
                        : 'Podés pegar varias partidas en un solo PGN.'
                }
                sx={{ mb: 2, '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 14 } }}
            />

            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1.5,
                    mb: 2,
                }}
            >
                <Typography component="span" variant="body2" color="text.secondary">
                    o sube un archivo PGN
                </Typography>
                <Button variant="outlined" component="label" size="small" sx={{ textTransform: 'none' }}>
                    Seleccionar archivo
                    <input type="file" hidden accept=".pgn,.txt" onChange={handleFilePick} />
                </Button>
                <Typography variant="body2" color="text.secondary">
                    {pgnFile ? pgnFile.name : 'Ningún archivo seleccionado'}
                </Typography>
                {pgnFile && (
                    <Button
                        size="small"
                        onClick={() => setPgnFile(null)}
                        sx={{ textTransform: 'none', minWidth: 0 }}
                    >
                        Quitar archivo
                    </Button>
                )}
            </Box>

            <FormControlLabel
                control={
                    <Checkbox
                        checked={goToQueueAfter}
                        onChange={(e) => setGoToQueueAfter(e.target.checked)}
                    />
                }
                label="Después de importar, ir a Coach → Cola para analizar con Stockfish"
                sx={{ mb: 1, alignItems: 'flex-start' }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<CloudUpload />}
                    disabled={loading}
                    onClick={() => submitImport()}
                    sx={{ fontWeight: 700, letterSpacing: 0.5, px: 4, py: 1.25 }}
                >
                    {loading ? 'Importando…' : 'Importar partida'}
                </Button>
            </Box>
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
        <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 400 }}>
                Importar partida
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                Importá una partida desde un PGN. Podés revisarla jugada a jugada en Coach, encolar
                análisis Stockfish y comparar candidatas en los momentos críticos.
            </Typography>

            <Alert
                severity="info"
                icon={<InfoOutlined fontSize="inherit" />}
                sx={{ mb: 3, alignItems: 'flex-start' }}
            >
                El jugador a analizar ([White] / [Black]) se elige en{' '}
                <Link component={RouterLink} to="/coach/jobs">
                    Coach → Cola
                </Link>
                , no en el login.{' '}
                <Link component={RouterLink} to="/coach/jobs">
                    Ver partidas ya importadas
                </Link>
                . El menú <strong>Partidas</strong> es otro catálogo (legacy).
            </Alert>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, textTransform: 'none' }}>
                <Tab label="PGN" sx={{ textTransform: 'none' }} />
                <Tab label="Chess.com" sx={{ textTransform: 'none' }} />
                <Tab label="Lichess" sx={{ textTransform: 'none' }} />
            </Tabs>

            {tab === 0 && (
                <PgnImportPanel
                    corpusType={corpusType}
                    onCorpusChange={setCorpusType}
                    corpusOptions={corpusOptions}
                />
            )}
            {tab === 1 && <SiteSyncPlaceholder siteLabel="Chess.com" />}
            {tab === 2 && <SiteSyncPlaceholder siteLabel="Lichess" />}

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 3 }}>
                Importación legacy (features ML):{' '}
                <Link component={RouterLink} to="/import/legacy">
                    /import/legacy
                </Link>
            </Typography>
        </Paper>
    )
}
