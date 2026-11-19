import React, { useCallback, useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
} from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { CoachPageLayout } from '../components/coach/CoachSubNav.jsx'
import CoachStudyWorkspace from '../components/coach/CoachStudyWorkspace.jsx'
import { createStudyRootFromFen } from '../utils/coachStudyFromFen.js'
import CoachFenPieceEditor from '../components/coach/CoachFenPieceEditor.jsx'
import {
    EMPTY_BOARD_FEN,
    loadPositionFenFromSession,
    parseFenInput,
    savePositionFenToSession,
    STARTING_FEN,
} from '../utils/parseFenInput.js'
import { createEmptyRoot, mainLineEndPath } from '../utils/coachVariationTree.js'
import { buildPositionStudyPgnFromTree } from '../utils/coachPositionStudyPgn.js'
import { createCoachGameFromPosition, parseApiDetail } from '../services/module07Service.js'

const FEN_PARSE_OPTS = { allowIllegal: true }

function resetTreeFromFen(fen) {
    const built = createStudyRootFromFen(fen, FEN_PARSE_OPTS)
    if (!built.ok) {
        return null
    }
    return {
        root: built.root,
        path: mainLineEndPath(built.root),
    }
}

export default function CoachPositionPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const entryMessage = location.state?.message ?? null
    const [fenInput, setFenInput] = useState('')
    const [activeFen, setActiveFen] = useState(null)
    const [parseError, setParseError] = useState(null)
    const [orientation, setOrientation] = useState('white')
    const [coachPov, setCoachPov] = useState('white')
    const [treeRoot, setTreeRoot] = useState(() => createEmptyRoot())
    const [cursorPath, setCursorPath] = useState([])
    const [editorKey, setEditorKey] = useState(0)
    const [saveCatalogBusy, setSaveCatalogBusy] = useState(false)
    const [saveCatalogMessage, setSaveCatalogMessage] = useState(null)

    const loadFenIntoStudy = useCallback((fen) => {
        const synced = resetTreeFromFen(fen)
        if (!synced) {
            return false
        }
        setActiveFen(fen)
        setTreeRoot(synced.root)
        setCursorPath(synced.path)
        savePositionFenToSession(fen)
        return true
    }, [])

    useEffect(() => {
        const fromNav = location.state?.fen
        const candidate = fromNav || loadPositionFenFromSession()
        if (!candidate) return
        const parsed = parseFenInput(candidate, FEN_PARSE_OPTS)
        if (!parsed.ok) return
        setFenInput(parsed.fen)
        loadFenIntoStudy(parsed.fen)
    }, [location.state?.fen, loadFenIntoStudy])

    const applyFen = useCallback(
        (raw) => {
            const text = raw ?? fenInput
            const result = parseFenInput(text, FEN_PARSE_OPTS)
            if (!result.ok) {
                setParseError(result.error)
                return false
            }
            setParseError(null)
            setFenInput(result.fen)
            return loadFenIntoStudy(result.fen)
        },
        [fenInput, loadFenIntoStudy],
    )

    const loadStart = () => {
        setFenInput(STARTING_FEN)
        setEditorKey((k) => k + 1)
        applyFen(STARTING_FEN)
    }

    const clearAll = () => {
        setFenInput('')
        setActiveFen(null)
        setParseError(null)
        setTreeRoot(createEmptyRoot())
        setCursorPath([])
        savePositionFenToSession(null)
        setEditorKey((k) => k + 1)
    }

    const syncTextToEditor = () => {
        const result = parseFenInput(fenInput, FEN_PARSE_OPTS)
        if (!result.ok) {
            setParseError(result.error)
            return
        }
        setParseError(null)
        setFenInput(result.fen)
        setEditorKey((k) => k + 1)
    }

    const savePositionToCatalog = useCallback(async () => {
        if (!activeFen || saveCatalogBusy) return
        setSaveCatalogBusy(true)
        setSaveCatalogMessage(null)
        try {
            const built = buildPositionStudyPgnFromTree(treeRoot, { studyName: 'Posición' })
            if (!built.ok) {
                setSaveCatalogMessage(built.error)
                return
            }
            const game = await createCoachGameFromPosition(built.pgn)
            navigate(`/coach/games/${game.id}/analysis`)
        } catch (err) {
            setSaveCatalogMessage(parseApiDetail(err))
        } finally {
            setSaveCatalogBusy(false)
        }
    }, [activeFen, saveCatalogBusy, treeRoot, navigate])

    const coachPovNorm = coachPov.toLowerCase() === 'black' ? 'black' : 'white'
    const orientationNorm = orientation.toLowerCase() === 'black' ? 'black' : 'white'

    return (
        <CoachPageLayout>
            <Typography variant="h5" gutterBottom>
                Coach
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Cargá un FEN y mové en el tablero: el PGN, motor live, clasificación y análisis avanzado
                se actualizan en el mismo panel (sin cambiar de pantalla).
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
                Análisis de posición (FEN)
            </Typography>
            {entryMessage && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {entryMessage}
                </Alert>
            )}

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <TextField
                    label="FEN"
                    multiline
                    minRows={2}
                    fullWidth
                    value={fenInput}
                    onChange={(e) => setFenInput(e.target.value)}
                    placeholder={STARTING_FEN}
                    sx={{ mb: 1.5, fontFamily: 'monospace' }}
                />
                <CoachFenPieceEditor
                    editorKey={editorKey}
                    fen={fenInput || EMPTY_BOARD_FEN}
                    orientation={orientationNorm}
                    boardWidth={420}
                    onFenChange={(next) => {
                        setFenInput(next)
                        setParseError(null)
                    }}
                />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                    <Button variant="contained" onClick={() => applyFen()}>
                        Cargar posición
                    </Button>
                    {activeFen ? (
                        <Button
                            variant="contained"
                            color="secondary"
                            disabled={saveCatalogBusy}
                            onClick={() => savePositionToCatalog()}
                        >
                            {saveCatalogBusy ? 'Guardando…' : 'Guardar en Partidas'}
                        </Button>
                    ) : null}
                    <Button variant="outlined" onClick={syncTextToEditor}>
                        Aplicar FEN al tablero
                    </Button>
                    <Button variant="outlined" onClick={loadStart}>
                        Posición inicial
                    </Button>
                    <Button variant="text" onClick={clearAll}>
                        Limpiar
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel id="orient-label">Orientación tablero</InputLabel>
                        <Select
                            labelId="orient-label"
                            label="Orientación tablero"
                            value={orientation}
                            onChange={(e) => setOrientation(e.target.value)}
                        >
                            <MenuItem value="white">Blancas abajo</MenuItem>
                            <MenuItem value="black">Negras abajo</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel id="pov-label">Clasificación (jugador)</InputLabel>
                        <Select
                            labelId="pov-label"
                            label="Clasificación (jugador)"
                            value={coachPov}
                            onChange={(e) => setCoachPov(e.target.value)}
                        >
                            <MenuItem value="white">Blancas</MenuItem>
                            <MenuItem value="black">Negras</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                {parseError && (
                    <Alert severity="error" sx={{ mt: 1.5 }}>
                        {parseError}
                    </Alert>
                )}
            </Paper>

            {saveCatalogMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {saveCatalogMessage}
                </Alert>
            )}

            {activeFen ? (
                <CoachStudyWorkspace
                    embedded
                    treeRoot={treeRoot}
                    setTreeRoot={setTreeRoot}
                    cursorPath={cursorPath}
                    setCursorPath={setCursorPath}
                    playerColor={coachPovNorm}
                    boardOrientation={orientationNorm}
                    showCoachSubNav={false}
                    persistClassification={false}
                    rootPositionLabel="Posición cargada"
                />
            ) : (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        Cargá un FEN para ver el tablero interactivo y la lista PGN.
                    </Typography>
                </Paper>
            )}
        </CoachPageLayout>
    )
}
