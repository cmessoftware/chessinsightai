import { useCallback, useEffect, useRef, useState } from 'react'
import {
    getStockfishBrowserEngine,
    mapLiveLinesToDisplay,
} from '../engine/clientStockfishEngine.js'
import { collectFensFromTree } from '../utils/coachPgnDisplay.js'
import { formatPlayerEval } from '../utils/engineEval.js'

/**
 * Evaluación por FEN para el panel PGN (prefetch en background + merge en vivo).
 */
export function usePgnEvalCache(treeRoot, playerColor, { prefetchDepth = 10, prefetchEnabled = true } = {}) {
    const [evalByFen, setEvalByFen] = useState({})
    const evalRef = useRef({})
    evalRef.current = evalByFen
    const prefetchGen = useRef(0)

    const setEvalForFen = useCallback((fen, playerScore) => {
        if (!fen || !playerScore) return
        const text = formatPlayerEval(playerScore)
        setEvalByFen((prev) => (prev[fen] === text ? prev : { ...prev, [fen]: text }))
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
                if (evalRef.current[fen]) continue
                try {
                    const raw = await engine.analyze({ fen, depth: prefetchDepth, multipv: 1 })
                    if (cancelled || gen !== prefetchGen.current) return
                    const lines = mapLiveLinesToDisplay(raw, fen, playerColor)
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
    }, [treeRoot, playerColor, prefetchDepth, prefetchEnabled, setEvalForFen])

    return { evalByFen, setEvalForFen }
}
