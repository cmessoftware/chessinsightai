import React, { useEffect, useState } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import CoachStudyWorkspace from '../components/coach/CoachStudyWorkspace.jsx'
import CoachSubNav from '../components/coach/CoachSubNav.jsx'
import { getGame, listGames } from '../services/module07Service.js'
import { createStudyRootFromFen } from '../utils/coachStudyFromFen.js'
import { loadCoachAnalysisCursor, loadCoachLastGameId } from '../utils/coachLastGameSession.js'
import { buildReplayFromPgn } from '../utils/coachPgnReplay.js'
import { STARTING_FEN } from '../utils/parseFenInput.js'
import {
    buildTreeFromMainLine,
    createEmptyRoot,
    getNodeAtPath,
    mainLineEndPath,
} from '../utils/coachVariationTree.js'

export default function CoachHomePage() {
    const [loading, setLoading] = useState(true)
    const [gameMeta, setGameMeta] = useState(null)
    const [treeRoot, setTreeRoot] = useState(() => createEmptyRoot())
    const [cursorPath, setCursorPath] = useState([])

    useEffect(() => {
        let cancelled = false
        const run = async () => {
            setLoading(true)
            try {
                const games = await listGames()
                const savedId = loadCoachLastGameId()
                const pick =
                    games.find((g) => g.id === savedId)
                    || games.find((g) => g.client_analyzed)
                    || games[0]
                    || null

                if (!cancelled && pick) {
                    const detail = await getGame(pick.id).catch(() => pick)
                    setGameMeta(detail)
                    if (detail?.pgn) {
                        const built = buildReplayFromPgn(detail.pgn)
                        const tree = buildTreeFromMainLine(built.fens, built.ucis, built.moves)
                        setTreeRoot(tree)
                        const saved = loadCoachAnalysisCursor(detail.id)
                        const fallback = mainLineEndPath(tree)
                        setCursorPath(saved && getNodeAtPath(tree, saved) ? saved : fallback)
                    }
                } else if (!cancelled) {
                    setGameMeta(null)
                    const built = createStudyRootFromFen(STARTING_FEN)
                    if (built.ok) {
                        setTreeRoot(built.root)
                        setCursorPath(mainLineEndPath(built.root))
                    }
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        run()
        return () => {
            cancelled = true
        }
    }, [])

    if (loading) {
        return (
            <Box>
                <Typography variant="h5" gutterBottom>
                    Coach
                </Typography>
                <CoachSubNav />
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            </Box>
        )
    }

    const playerColor =
        (gameMeta?.player_color || 'white').toLowerCase() === 'black' ? 'black' : 'white'

    return (
        <CoachStudyWorkspace
            title="Coach"
            subtitle={
                gameMeta ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Última partida: {gameMeta.white_player} vs {gameMeta.black_player}
                        {gameMeta.client_analyzed
                            ? ` · clasificación guardada (${gameMeta.client_analysis_ply_count} jug.)`
                            : ''}
                    </Typography>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Sin partidas importadas — estudiá desde la posición inicial o importá un PGN.
                    </Typography>
                )
            }
            treeRoot={treeRoot}
            setTreeRoot={setTreeRoot}
            cursorPath={cursorPath}
            setCursorPath={setCursorPath}
            playerColor={playerColor}
            gameMeta={gameMeta}
            gameId={gameMeta?.id}
            showCoachSubNav
            persistClassification={Boolean(gameMeta?.id)}
            rootPositionLabel={gameMeta ? 'Partida' : 'Posición inicial'}
            embedded={false}
        />
    )
}
