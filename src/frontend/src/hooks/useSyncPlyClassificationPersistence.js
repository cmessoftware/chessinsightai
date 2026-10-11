import { useEffect, useRef, useState } from 'react'
import {
    isClassificationCacheable,
    loadClassificationSessionCache,
    mainLineSignature,
    saveClassificationSessionCache,
} from '../utils/coachClassificationSessionCache.js'
import { collectMainLinePlies } from '../utils/coachPlyClassification.js'
import { getGameAnnotations, putGameAnnotations } from '../services/module07Service.js'

const RULES_VERSION = 1

/** Load server annotations into session cache before WASM classification runs. */
export function usePlyAnnotationsHydration(
    treeRoot,
    { gameId = null, depth = 12, multipv = 3, eloKey = '', enabled = true } = {},
) {
    const hydratedRef = useRef(false)
    const [hydrateReady, setHydrateReady] = useState(false)
    const lineSignature = treeRoot?.fen ? mainLineSignature(treeRoot) : null

    useEffect(() => {
        hydratedRef.current = false
        setHydrateReady(false)
    }, [gameId])

    useEffect(() => {
        if (!enabled || !gameId || !lineSignature) {
            setHydrateReady(true)
            return undefined
        }

        let cancelled = false

        const hydrate = async () => {
            try {
                const data = await getGameAnnotations(gameId)
                if (cancelled || hydratedRef.current) return
                if (
                    data?.main_line_signature
                    && data.main_line_signature === lineSignature
                    && data.rules_version === RULES_VERSION
                    && data.stockfish_depth === depth
                    && data.stockfish_multipv === multipv
                ) {
                    const fromServer = {}
                    for (const row of data.annotations || []) {
                        if (row?.path_key && row.payload) {
                            fromServer[row.path_key] = row.payload
                        }
                    }
                    const cached = loadClassificationSessionCache({
                        gameId,
                        depth,
                        multipv,
                        mainLineSignature: lineSignature,
                        eloKey,
                    })
                    const merged = { ...(cached?.byPathKey || {}), ...fromServer }
                    saveClassificationSessionCache({
                        gameId,
                        depth,
                        multipv,
                        mainLineSignature: lineSignature,
                        eloKey,
                        byPathKey: merged,
                        persist: true,
                    })
                }
                hydratedRef.current = true
            } catch {
                hydratedRef.current = true
            } finally {
                if (!cancelled) setHydrateReady(true)
            }
        }

        hydrate()
        return () => {
            cancelled = true
        }
    }, [enabled, gameId, lineSignature, depth, multipv, eloKey])

    return { hydrateReady }
}

/** PUT full main-line snapshot when client classification completes. */
export function usePlyAnnotationsPersist(
    treeRoot,
    {
        gameId = null,
        depth = 12,
        multipv = 3,
        byPathKey = {},
        progress = { status: 'idle' },
        enabled = true,
    } = {},
) {
    const persistedSigRef = useRef(null)
    const lineSignature = treeRoot?.fen ? mainLineSignature(treeRoot) : null

    useEffect(() => {
        persistedSigRef.current = null
    }, [gameId])

    useEffect(() => {
        if (!enabled || !gameId || !lineSignature) return
        if (progress.status !== 'done') return
        if (persistedSigRef.current === lineSignature) return

        const jobs = collectMainLinePlies(treeRoot)
        const items = []
        for (const job of jobs) {
            const payload = byPathKey[job.pathKey]
            if (!isClassificationCacheable(payload)) continue
            items.push({
                path_key: job.pathKey,
                ply: job.ply,
                fen_before: job.fenBefore,
                played_uci: job.playedUci,
                payload,
            })
        }
        if (items.length !== jobs.length) return

        persistedSigRef.current = lineSignature
        putGameAnnotations(gameId, {
            main_line_signature: lineSignature,
            rules_version: RULES_VERSION,
            stockfish_depth: depth,
            stockfish_multipv: multipv,
            items,
        }).catch(() => {
            persistedSigRef.current = null
        })
    }, [
        enabled,
        gameId,
        lineSignature,
        treeRoot,
        byPathKey,
        progress.status,
        depth,
        multipv,
    ])
}
