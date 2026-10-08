import { useEffect, useMemo, useRef, useState } from 'react'
import { CancelledError, getStockfishBrowserEngine } from '../engine/clientStockfishEngine.js'
import {
    isClassificationCacheable,
    loadClassificationSessionCache,
    mainLineSignature,
    pruneClassificationCache,
    saveClassificationSessionCache,
} from '../utils/coachClassificationSessionCache.js'
import { parseMoverEloFromGame } from '../utils/coachPlayerElo.js'
import { enrichClassificationWithPedagogy } from '../utils/coachPedagogicalImpact.js'
import {
    classifyPlyWithEngine,
    collectMainLinePlies,
    pathKeyFromPath,
} from '../utils/coachPlyClassification.js'

/**
 * Background WASM classification for each main-line ply (CA-2, ambos colores).
 */
export function usePgnMoveClassification(
    treeRoot,
    _playerColor,
    {
        enabled = true,
        depth = 12,
        multipv = 3,
        cursorPath = [],
        gameMeta = null,
        gameId = null,
        persistSessionCache = true,
    } = {},
) {
    const [byPathKey, setByPathKey] = useState({})
    const [progress, setProgress] = useState({ done: 0, total: 0, status: 'idle', error: null })
    const runGen = useRef(0)
    const byPathRef = useRef({})
    byPathRef.current = byPathKey
    const cursorPathKey = pathKeyFromPath(cursorPath)
    const cursorKeyRef = useRef(cursorPathKey)
    cursorKeyRef.current = cursorPathKey

    const jobs = useMemo(() => collectMainLinePlies(treeRoot), [treeRoot])

    const jobsKey = useMemo(() => jobs.map((j) => j.pathKey).join('|'), [jobs])

    const lineSignature = useMemo(() => mainLineSignature(treeRoot), [treeRoot])

    const validPathKeys = useMemo(() => new Set(jobs.map((j) => j.pathKey)), [jobs])

    const eloKey = useMemo(
        () => `${gameMeta?.white_elo ?? ''}|${gameMeta?.black_elo ?? ''}`,
        [gameMeta?.white_elo, gameMeta?.black_elo],
    )

    useEffect(() => {
        if (!enabled || !treeRoot?.fen || jobs.length === 0) {
            setProgress({ done: 0, total: jobs.length, status: 'idle', error: null })
            return undefined
        }

        const gen = ++runGen.current
        let cancelled = false

        const cached = loadClassificationSessionCache({
            gameId,
            depth,
            multipv,
            mainLineSignature: lineSignature,
            eloKey,
        })
        const seed = pruneClassificationCache(cached?.byPathKey ?? {}, validPathKeys)
        const cachedDone = jobs.filter((j) => isClassificationCacheable(seed[j.pathKey])).length

        setByPathKey(seed)
        setProgress({
            done: cachedDone,
            total: jobs.length,
            status: cachedDone >= jobs.length ? 'done' : 'running',
            error: null,
        })

        if (cachedDone >= jobs.length) {
            return () => {
                cancelled = true
            }
        }

        const run = async () => {
            let engine
            try {
                engine = await getStockfishBrowserEngine()
            } catch (err) {
                if (!cancelled && gen === runGen.current) {
                    setProgress((p) => ({
                        ...p,
                        status: 'error',
                        error: err.message || String(err),
                    }))
                }
                return
            }

            let done = cachedDone
            for (const job of jobs) {
                if (cancelled || gen !== runGen.current) return

                if (isClassificationCacheable(seed[job.pathKey])) {
                    continue
                }

                const priority = job.pathKey === cursorKeyRef.current ? 'live' : 'normal'

                try {
                    const row = await classifyPlyWithEngine(engine, job, {
                        depth,
                        multipv,
                        priority,
                    })
                    if (cancelled || gen !== runGen.current) return
                    const moverElo = parseMoverEloFromGame(gameMeta, row.moverColor)
                    const enriched = enrichClassificationWithPedagogy(row, moverElo)
                    setByPathKey((prev) => {
                        const next = { ...prev, [job.pathKey]: enriched }
                        saveClassificationSessionCache({
                            gameId,
                            depth,
                            multipv,
                            mainLineSignature: lineSignature,
                            eloKey,
                            byPathKey: next,
                            persist: persistSessionCache,
                        })
                        return next
                    })
                } catch (err) {
                    if (cancelled || gen !== runGen.current) return
                    if (err instanceof CancelledError) continue
                    setByPathKey((prev) => ({
                        ...prev,
                        [job.pathKey]: {
                            engineLabel: 'pending',
                            cpLoss: null,
                            pathKey: job.pathKey,
                            ply: job.ply,
                            san: job.san,
                            reason: 'engine_error',
                        },
                    }))
                }

                done += 1
                setProgress({ done, total: jobs.length, status: 'running', error: null })
                await new Promise((r) => setTimeout(r, 0))
            }

            if (!cancelled && gen === runGen.current) {
                setProgress({ done, total: jobs.length, status: 'done', error: null })
            }
        }

        run()
        return () => {
            cancelled = true
        }
    }, [
        enabled,
        gameId,
        jobs,
        jobsKey,
        lineSignature,
        validPathKeys,
        depth,
        multipv,
        gameMeta,
        eloKey,
        persistSessionCache,
    ])

    return { classificationByPathKey: byPathKey, progress }
}
