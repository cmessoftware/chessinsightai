import React, { useCallback, useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    FormGroup,
    TextField,
    Typography,
} from '@mui/material'
import { CloudDownload, Save } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import {
    getChesscomImportSettings,
    parseApiDetail,
    runChesscomImport,
    saveChesscomImportSettings,
} from '../../services/module07Service.js'
import CoachImportProgress from './CoachImportProgress.jsx'
import { COACH_RETURN_PARTIDAS } from './CoachSubNav.jsx'

const PERF_OPTIONS = [
    { value: 'bullet', label: 'Bullet' },
    { value: 'blitz', label: 'Blitz' },
    { value: 'rapid', label: 'Rapid' },
    { value: 'daily', label: 'Correspondencia' },
]

function navigateAfterImport(navigate, result) {
    const imported = result.games || []
    const count = result.count ?? imported.length
    const newCount = result.new_count ?? imported.filter((g) => g.is_new).length
    const dupCount = count - newCount
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
            ? 'Partida importada desde Chess.com.'
            : 'Partida actualizada desde Chess.com.'
        navigate(`/coach/games/${g.id}/analysis`, {
            state: { returnTo: COACH_RETURN_PARTIDAS, message: baseMessage },
        })
        return
    }
    const dupNote = dupCount > 0 ? ` ${dupCount} ya existían (resaltadas).` : ''
    const perfNote = result.perf_type ? ` Ritmo: ${result.perf_type}.` : ''
    navigate(COACH_RETURN_PARTIDAS, {
        state: {
            message: `${newCount} nueva(s), ${count} en total.${dupNote}${perfNote} Elegí jugador y encolá análisis.`,
            ...partidasState,
        },
    })
}

export default function ChesscomImportPanel({ corpusType }) {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState(null)
    const [info, setInfo] = useState(null)
    const [importComplete, setImportComplete] = useState(false)

    const [chesscomUsername, setChesscomUsername] = useState('')
    const [sinceDate, setSinceDate] = useState('')
    const [untilDate, setUntilDate] = useState('')
    const [perfTypes, setPerfTypes] = useState(PERF_OPTIONS.map((o) => o.value))
    const [batchSize, setBatchSize] = useState(200)
    const [playerAlias, setPlayerAlias] = useState('')

    const loadSettings = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const s = await getChesscomImportSettings()
            setChesscomUsername(s.chesscom_username || '')
            setSinceDate(s.since_date || '')
            setUntilDate(s.until_date || '')
            setPerfTypes(
                Array.isArray(s.perf_types) && s.perf_types.length
                    ? s.perf_types
                    : PERF_OPTIONS.map((o) => o.value),
            )
            setBatchSize(s.batch_size || 200)
            setPlayerAlias(s.player_alias || '')
            setImportComplete(Boolean(s.last_cursor?.completed))
        } catch (err) {
            setError(parseApiDetail(err))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadSettings()
    }, [loadSettings])

    const togglePerf = (value) => {
        setPerfTypes((prev) =>
            prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
        )
    }

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        setInfo(null)
        try {
            await saveChesscomImportSettings({
                chesscom_username: chesscomUsername.trim(),
                since_date: sinceDate.trim() || null,
                until_date: untilDate.trim() || null,
                perf_types: perfTypes,
                batch_size: Number(batchSize) || 200,
                player_alias: playerAlias.trim() || null,
            })
            setInfo('Configuración guardada.')
        } catch (err) {
            setError(parseApiDetail(err))
        } finally {
            setSaving(false)
        }
    }

    const handleImport = async ({ resume = true, resetCursor = false } = {}) => {
        if (!chesscomUsername.trim()) {
            setError('Indicá el usuario de Chess.com.')
            return
        }
        setImporting(true)
        setError(null)
        setInfo(null)
        try {
            await saveChesscomImportSettings({
                chesscom_username: chesscomUsername.trim(),
                since_date: sinceDate.trim() || null,
                until_date: untilDate.trim() || null,
                perf_types: perfTypes,
                batch_size: Number(batchSize) || 200,
                player_alias: playerAlias.trim() || null,
                reset_cursor: resetCursor,
            })
            const result = await runChesscomImport({
                corpus_type: corpusType,
                resume,
                reset_cursor: resetCursor,
            })
            setImportComplete(Boolean(result.import_complete))
            if (result.message && !result.count) {
                setInfo(result.message)
                return
            }
            if (result.count > 0) {
                navigateAfterImport(navigate, result)
                return
            }
            setInfo('Lote sin partidas importadas.')
        } catch (err) {
            setError(parseApiDetail(err))
        } finally {
            setImporting(false)
        }
    }

    if (loading) {
        return (
            <Typography variant="body2" color="text.secondary">
                Cargando configuración Chess.com…
            </Typography>
        )
    }

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {info && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {info}
                </Alert>
            )}

            <TextField
                fullWidth
                size="small"
                label="Usuario Chess.com"
                value={chesscomUsername}
                onChange={(e) => setChesscomUsername(e.target.value)}
                sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <TextField
                    size="small"
                    label="Desde"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={sinceDate}
                    onChange={(e) => setSinceDate(e.target.value)}
                />
                <TextField
                    size="small"
                    label="Hasta"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={untilDate}
                    onChange={(e) => setUntilDate(e.target.value)}
                />
                <TextField
                    size="small"
                    label="Partidas por lote"
                    type="number"
                    inputProps={{ min: 1, max: 500 }}
                    value={batchSize}
                    onChange={(e) => setBatchSize(e.target.value)}
                    sx={{ width: 160 }}
                />
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Ritmos (por defecto todos; hasta {batchSize} partidas por ritmo y lote)
            </Typography>
            <FormGroup row sx={{ mb: 2 }}>
                {PERF_OPTIONS.map((o) => (
                    <FormControlLabel
                        key={o.value}
                        control={
                            <Checkbox
                                checked={perfTypes.includes(o.value)}
                                onChange={() => togglePerf(o.value)}
                            />
                        }
                        label={o.label}
                    />
                ))}
            </FormGroup>

            <TextField
                fullWidth
                size="small"
                label="Alias POV (opcional)"
                helperText="Reemplaza tu usuario Chess.com en [White]/[Black] al importar; el original queda en provenance para rollback (FEAT-029)."
                value={playerAlias}
                onChange={(e) => setPlayerAlias(e.target.value)}
                sx={{ mb: 2 }}
            />

            <CoachImportProgress active={importing} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Button
                    variant="outlined"
                    startIcon={<Save />}
                    disabled={saving || importing}
                    onClick={handleSave}
                >
                    {saving ? 'Guardando…' : 'Guardar configuración'}
                </Button>
                <Button
                    variant="contained"
                    startIcon={
                        importing ? (
                            <CircularProgress size={18} color="inherit" />
                        ) : (
                            <CloudDownload />
                        )
                    }
                    disabled={importing}
                    onClick={() => handleImport({ resume: false, resetCursor: true })}
                >
                    {importing ? 'Importando…' : 'Importar desde el inicio'}
                </Button>
                <Button
                    variant="contained"
                    color="secondary"
                    disabled={importing || importComplete}
                    onClick={() => handleImport({ resume: true, resetCursor: false })}
                >
                    {importing ? 'Importando…' : 'Continuar lote'}
                </Button>
            </Box>
            {importComplete && (
                <Typography variant="body2" color="text.secondary">
                    Importación completa para los ritmos configurados. Podés reiniciar con «Importar
                    desde el inicio».
                </Typography>
            )}
        </Box>
    )
}
