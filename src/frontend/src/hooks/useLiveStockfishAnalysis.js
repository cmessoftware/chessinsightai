import { useEffect, useState } from 'react'
import {
    CancelledError,
    getStockfishBrowserEngine,
    mapLiveLinesToDisplay,
} from '../engine/clientStockfishEngine.js'

/**
 * Debounced browser Stockfish for the current FEN (lite WASM, single-thread).
 */
export function useLiveStockfishAnalysis(
    fen,
    { enabled = true, depth = 14, multipv = 2, debounceMs = 150, playerColor = 'white' } = {},
) {
    const [state, setState] = useState({
        status: 'idle',
        lines: [],
        depthReached: null,
        error: null,
    })

    useEffect(() => {
        if (!enabled || !fen) {
            setState({ status: 'idle', lines: [], depthReached: null, error: null })
            return undefined
        }

        let cancelled = false
        let engineRef = null

        const timer = setTimeout(async () => {
            setState((prev) => ({ ...prev, status: 'loading', error: null }))
            try {
                const engine = await getStockfishBrowserEngine()
                engineRef = engine
                const raw = await engine.analyze({ fen, depth, multipv })
                if (cancelled) return
                const lines = mapLiveLinesToDisplay(raw, fen, playerColor)
                const depthReached = raw.reduce((max, l) => Math.max(max, l.depth || 0), 0)
                setState({ status: 'ready', lines, depthReached, error: null })
            } catch (err) {
                if (cancelled || err instanceof CancelledError) return
                setState({
                    status: 'error',
                    lines: [],
                    depthReached: null,
                    error: err.message || String(err),
                })
            }
        }, debounceMs)

        return () => {
            cancelled = true
            clearTimeout(timer)
            engineRef?.stop()
        }
    }, [fen, enabled, depth, multipv, debounceMs, playerColor])

    return state
}
