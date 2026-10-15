import React, { useCallback, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material'
import { CloudUpload } from '@mui/icons-material'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { ingestPgn } from '../../services/module07Service.js'
import {
    COACH_PGN_IMPORT_MAX_GAMES,
    pgnMultiGameImportNotice,
} from '../../utils/coachPgnImport.js'
import { COACH_RETURN_PARTIDAS } from './CoachSubNav.jsx'

async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file)
    })
}

export default function PgnImportPanel({ corpusType, onCorpusChange, corpusOptions }) {
    const navigate = useNavigate()
    const [pgnPaste, setPgnPaste] = useState('')
    const [pgnFile, setPgnFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
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
                maxGames: COACH_PGN_IMPORT_MAX_GAMES,
            })
            const imported = result.games || []
            const count = result.count ?? imported.length
            const newCount = result.new_count ?? imported.filter((g) => g.is_new).length
            const dupCount = count - newCount
            const multiNote = pgnMultiGameImportNotice(result)
            setPgnPaste('')
            setPgnFile(null)

            const partidasState = {
                highlightGameIds: imported.map((g) => g.id),
                importedGames: imported.map((g) => ({
                    id: g.id,
                    is_new: Boolean(g.is_new),
                })),
            }

            if (count === 1 && imported[0]?.id) {
                const g = imported[0]
                const baseMessage = g.is_new
                    ? 'Partida importada. Podés encolar Stockfish en Partidas.'
                    : 'Partida actualizada en la biblioteca.'
                navigate(`/coach/games/${g.id}/analysis`, {
                    state: {
                        returnTo: COACH_RETURN_PARTIDAS,
                        message: multiNote ? `${multiNote} ${baseMessage}` : baseMessage,
                    },
                })
                return
            }

            const dupNote = dupCount > 0 ? ` ${dupCount} ya existían (resaltadas).` : ''
            const multiPrefix = multiNote ? `${multiNote} ` : ''
            navigate(COACH_RETURN_PARTIDAS, {
                state: {
                    message: `${multiPrefix}${newCount} nueva(s), ${count} en total.${dupNote} Elegí jugador y encolá análisis.`,
                    ...partidasState,
                },
            })
        } catch (err) {
            const detail = err.response?.data?.detail
            setError(
                typeof detail === 'string' ? detail : err.message || 'Error al importar',
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
                htmlFor="pgn-paste-coach"
                variant="subtitle1"
                sx={{ display: 'block', fontWeight: 600, mb: 1 }}
            >
                Pega el texto PGN aquí
            </Typography>
            <TextField
                id="pgn-paste-coach"
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
                        : `Podés pegar o subir un PGN con varias partidas (hasta ${COACH_PGN_IMPORT_MAX_GAMES} por importación).`
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

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<CloudUpload />}
                    disabled={loading}
                    onClick={() => submitImport()}
                    sx={{ fontWeight: 700, letterSpacing: 0.5, px: 4, py: 1.25 }}
                >
                    {loading ? 'Importando…' : 'Importar partidas'}
                </Button>
            </Box>
        </Box>
    )
}
