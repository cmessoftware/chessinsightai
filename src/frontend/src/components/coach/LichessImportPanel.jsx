import React, { useCallback, useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Collapse,
    FormControlLabel,
    FormGroup,
    TextField,
    Typography,
} from '@mui/material'
import { CloudDownload, Save } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import {
    getLichessImportSettings,
    parseApiDetail,
    runLichessImport,
    saveLichessImportSettings,
} from '../../services/module07Service.js'
import { useAuth } from '../../hooks/useAuth.js'
import { COACH_RETURN_PARTIDAS } from './CoachSubNav.jsx'

function normalizePlayerAlias(alias, lichessUsername, appUsername) {
    const a = (alias || '').trim()
    if (!a) return null
    const lichess = (lichessUsername || '').trim()
    const app = (appUsername || '').trim()
    if (lichess && a.toLowerCase() === lichess.toLowerCase()) return null
    if (app && a.toLowerCase() === app.toLowerCase()) return null
    return a
}

/** Evita la barra gris de autofill del navegador (login) sobre inputs del formulario. */
const noLoginAutofillSx = {
    '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
        WebkitBoxShadow: '0 0 0 100px rgb(255, 255, 255) inset',
        WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
        caretColor: 'rgba(0, 0, 0, 0.87)',
        transition: 'background-color 99999s ease-out 0s',
    },
}

const PERF_OPTIONS = [
    { value: 'ultraBullet', label: 'UltraBullet' },
    { value: 'bullet', label: 'Bullet' },
    { value: 'blitz', label: 'Blitz' },
    { value: 'rapid', label: 'Rapid' },
    { value: 'classical', label: 'Classical' },
    { value: 'correspondence', label: 'Correspondencia' },
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
            ? 'Partida importada desde Lichess.'
            : 'Partida actualizada desde Lichess.'
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

export default function LichessImportPanel({ corpusType }) {
    const navigate = useNavigate()
    const { user } = useAuth()
    const appUsername = user?.username || ''
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [importing, setImporting] = useState(false)
    const [error, setError] = useState(null)
    const [info, setInfo] = useState(null)
    const [showTokenHelp, setShowTokenHelp] = useState(false)
    const [importComplete, setImportComplete] = useState(false)

    const [lichessUsername, setLichessUsername] = useState('')
    const [sinceDate, setSinceDate] = useState('')
    const [untilDate, setUntilDate] = useState('')
    const [perfTypes, setPerfTypes] = useState(PERF_OPTIONS.map((o) => o.value))
    const [batchSize, setBatchSize] = useState(200)
    const [playerAlias, setPlayerAlias] = useState('')
    const [apiToken, setApiToken] = useState('')
    const [hasStoredToken, setHasStoredToken] = useState(false)
    const [tokenHint, setTokenHint] = useState(null)
    const [clearToken, setClearToken] = useState(false)

    const loadSettings = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const s = await getLichessImportSettings()
            setLichessUsername(s.lichess_username || '')
            setSinceDate(s.since_date || '')
            setUntilDate(s.until_date || '')
            setPerfTypes(
                Array.isArray(s.perf_types) && s.perf_types.length
                    ? s.perf_types
                    : PERF_OPTIONS.map((o) => o.value),
            )
            setBatchSize(s.batch_size || 200)
            setPlayerAlias(
                normalizePlayerAlias(s.player_alias, s.lichess_username, appUsername) || '',
            )
            setHasStoredToken(Boolean(s.has_api_token))
            setTokenHint(s.api_token_hint || null)
            setImportComplete(Boolean(s.last_cursor?.completed))
        } catch (err) {
            setError(parseApiDetail(err))
        } finally {
            setLoading(false)
        }
    }, [appUsername])

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
            const body = {
                lichess_username: lichessUsername.trim(),
                since_date: sinceDate.trim() || null,
                until_date: untilDate.trim() || null,
                perf_types: perfTypes,
                batch_size: Number(batchSize) || 200,
                player_alias: normalizePlayerAlias(
                    playerAlias,
                    lichessUsername,
                    appUsername,
                ),
                clear_api_token: clearToken,
            }
            if (apiToken.trim()) {
                body.api_token = apiToken.trim()
            }
            const s = await saveLichessImportSettings(body)
            setPlayerAlias(
                normalizePlayerAlias(s.player_alias, s.lichess_username, appUsername) || '',
            )
            setHasStoredToken(Boolean(s.has_api_token))
            setTokenHint(s.api_token_hint || null)
            setApiToken('')
            setClearToken(false)
            setInfo('Configuración guardada.')
        } catch (err) {
            setError(parseApiDetail(err))
        } finally {
            setSaving(false)
        }
    }

    const handleImport = async ({ resume = true, resetCursor = false } = {}) => {
        if (!lichessUsername.trim()) {
            setError('Indicá el usuario de Lichess.')
            return
        }
        setImporting(true)
        setError(null)
        setInfo(null)
        try {
            await saveLichessImportSettings({
                lichess_username: lichessUsername.trim(),
                since_date: sinceDate.trim() || null,
                until_date: untilDate.trim() || null,
                perf_types: perfTypes,
                batch_size: Number(batchSize) || 200,
                player_alias: normalizePlayerAlias(
                    playerAlias,
                    lichessUsername,
                    appUsername,
                ),
                reset_cursor: resetCursor,
            })
            const result = await runLichessImport({
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
                Cargando configuración Lichess…
            </Typography>
        )
    }

    return (
        <Box
            component="form"
            autoComplete="off"
            onSubmit={(e) => e.preventDefault()}
        >
            {error && (
                <Alert severity="error" sx={{ mb: 2, wordBreak: 'break-word' }}>
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
                label="Usuario Lichess"
                value={lichessUsername}
                onChange={(e) => setLichessUsername(e.target.value)}
                sx={{ mb: 2, ...noLoginAutofillSx }}
                inputProps={{
                    autoComplete: 'off',
                    name: 'coach_lichess_handle',
                    id: 'coach-lichess-handle',
                }}
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
                helperText="Opcional: otro nombre en [White]/[Black]. No uses tu login de Chess Trainer (p. ej. admin); el POV por defecto es el usuario Lichess de arriba."
                value={playerAlias}
                onChange={(e) => setPlayerAlias(e.target.value)}
                sx={{ mb: 2, ...noLoginAutofillSx }}
                inputProps={{
                    autoComplete: 'off',
                    name: 'coach_lichess_pov_alias',
                    id: 'coach-lichess-pov-alias',
                    'data-1p-ignore': 'true',
                    'data-lpignore': 'true',
                }}
            />

            <TextField
                fullWidth
                size="small"
                type="password"
                label="Token API Lichess (opcional)"
                helperText={
                    hasStoredToken
                        ? `Token guardado ${tokenHint || ''}. Dejá vacío para mantenerlo.`
                        : 'Mejora rate limits. Solo permisos de lectura de partidas públicas.'
                }
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                sx={{ mb: 1, ...noLoginAutofillSx }}
                inputProps={{
                    autoComplete: 'new-password',
                    name: 'coach_lichess_api_token',
                    id: 'coach-lichess-api-token',
                    'data-1p-ignore': 'true',
                    'data-lpignore': 'true',
                }}
            />
            <FormControlLabel
                control={
                    <Checkbox checked={clearToken} onChange={(e) => setClearToken(e.target.checked)} />
                }
                label="Quitar token guardado"
                sx={{ mb: 1 }}
            />
            <Button size="small" onClick={() => setShowTokenHelp((v) => !v)} sx={{ mb: 2 }}>
                {showTokenHelp ? 'Ocultar' : 'Cómo obtener el token'}
            </Button>
            <Collapse in={showTokenHelp}>
                <Alert severity="info" sx={{ mb: 2 }}>
                    En lichess.org → Preferencias → Acceso API → crear token personal con permiso
                    de <strong>leer partidas</strong> (no hace falta write). Pegalo arriba y guardá
                    la configuración.
                </Alert>
            </Collapse>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Button
                    variant="outlined"
                    startIcon={<Save />}
                    disabled={saving}
                    onClick={handleSave}
                >
                    {saving ? 'Guardando…' : 'Guardar configuración'}
                </Button>
                <Button
                    variant="contained"
                    startIcon={<CloudDownload />}
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
                    Importación completa para los ritmos configurados. Podés reiniciar con
                    «Importar desde el inicio».
                </Typography>
            )}
        </Box>
    )
}
