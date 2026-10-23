import { useCallback, useEffect, useRef, useState } from 'react'
import {
    getStockfishBrowserEngine,
    mapLiveLinesToDisplay,
} from '../engine/clientStockfishEngine.js'
import { collectFensFromTree } from '../utils/coachPgnDisplay.js'
import { formatStandardEval, toWhiteStandardScore } from '../utils/engineEval.js'

/**
 * Evaluación por FEN para el panel PGN (prefetch en background + merge en vivo).
 */
export function usePgnEvalCache(
    treeRoot,
    playerColor,
    { prefetchDepth = 10, prefetchEnabled = true, gameId = null } = {},
) {
    const [evalByFen, setEvalByFen] = useState({})
    const [scoreByFen, setScoreByFen] = useState({})
    const evalRef = useRef({})
    const scoreRef = useRef({})
    evalRef.current = evalByFen
    scoreRef.current = scoreByFen
    const prefetchGen = useRef(0)

    useEffect(() => {
        prefetchGen.current += 1
        setEvalByFen({})
        setScoreByFen({})
    }, [gameId])

    const setEvalForFen = useCallback((fen, playerScore) => {
        if (!fen || !playerScore) return
        const standard = toWhiteStandardScore(playerScore)
        const text = formatStandardEval(standard)
        setEvalByFen((prev) => (prev[fen] === text ? prev : { ...prev, [fen]: text }))
        setScoreByFen((prev) => (prev[fen] === standard ? prev : { ...prev, [fen]: standard }))
    }, [])

    useEffect(() => {
        if (!prefetchEnabled || !treeRoot?.fen) return undefined
        const gen = ++prefetchGen.current
        let cancelled = false

        const fens = collectFensFromTree(treeRoot)

        const run = async () => {
            let engine
            try {
                engine = await getStockfishBrowserEngine()
            } catch {
                return
            }
            for (const fen of fens) {
                if (cancelled || gen !== prefetchGen.current) return
                if (scoreRef.current[fen]) continue
                try {
                    const raw = await engine.analyze({ fen, depth: prefetchDepth, multipv: 1 })
                    if (cancelled || gen !== prefetchGen.current) return
                    const lines = mapLiveLinesToDisplay(raw, fen)
                    if (lines[0]?.player_score) {
                        setEvalForFen(fen, lines[0].player_score)
                    }
                } catch {
                    /* skip failed position */
                }
            }
        }

        run()
        return () => {
            cancelled = true
        }
    }, [treeRoot, prefetchDepth, prefetchEnabled, setEvalForFen])

    return { evalByFen, scoreByFen, setEvalForFen }
}
