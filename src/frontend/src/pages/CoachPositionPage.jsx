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
import { useLocation } from 'react-router-dom'
import { CoachPageLayout } from '../components/coach/CoachSubNav.jsx'
import CoachStudyWorkspace from '../components/coach/CoachStudyWorkspace.jsx'
import { createStudyRootFromFen } from '../utils/coachStudyFromFen.js'
import {
    loadPositionFenFromSession,
    parseFenInput,
    savePositionFenToSession,
    STARTING_FEN,
} from '../utils/parseFenInput.js'
import { createEmptyRoot, mainLineEndPath } from '../utils/coachVariationTree.js'

function resetTreeFromFen(fen) {
    const built = createStudyRootFromFen(fen)
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
    const entryMessage = location.state?.message ?? null
    const [fenInput, setFenInput] = useState('')
    const [activeFen, setActiveFen] = useState(null)
    const [parseError, setParseError] = useState(null)
    const [orientation, setOrientation] = useState('white')
    const [coachPov, setCoachPov] = useState('white')
    const [treeRoot, setTreeRoot] = useState(() => createEmptyRoot())
    const [cursorPath, setCursorPath] = useState([])

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
        const parsed = parseFenInput(candidate)
        if (!parsed.ok) return
        setFenInput(parsed.fen)
        loadFenIntoStudy(parsed.fen)
    }, [location.state?.fen, loadFenIntoStudy])

    const applyFen = useCallback(
        (raw) => {
            const text = raw ?? fenInput
            const result = parseFenInput(text)
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
        applyFen(STARTING_FEN)
    }

    const clearAll = () => {
        setFenInput('')
        setActiveFen(null)
        setParseError(null)
        setTreeRoot(createEmptyRoot())
        setCursorPath([])
        savePositionFenToSession(null)
    }

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
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                    <Button variant="contained" onClick={() => applyFen()}>
                        Cargar posición
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
                        <InputLabel id="pov-label">Eval (POV)</InputLabel>
                        <Select
                            labelId="pov-label"
                            label="Eval (POV)"
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
