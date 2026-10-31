import { useEffect, useRef } from 'react'
import { formatTreePgnMovetext } from '../utils/coachPgnExport.js'
import {
    buildStudyPgnFromTree,
    extractMovetextFromPgn,
    studyPgnMatchesTree,
} from '../utils/coachPgnTreeParse.js'
import {
    clearCoachStudyDraft,
    saveCoachStudyDraft,
} from '../utils/coachStudyDraftSession.js'
import { patchCoachGameStudyPgn } from '../services/module07Service.js'

const AUTO_SAVE_MS = 1200

/**
 * FEAT-066: debounced server save + session draft so F5 keeps work in the same tab session.
 */
export function useCoachStudyPersistence({
    gameId,
    treeRoot,
    effectiveSourcePgn,
    gameMeta,
    plyUserByPathKey,
    onGameMetaChange,
}) {
    const saveTimerRef = useRef(null)
    const savingRef = useRef(false)
    const lastSavedRef = useRef(null)

    useEffect(() => {
        if (!gameId || !effectiveSourcePgn || !treeRoot?.children?.length) {
            return undefined
        }

        const options = {
            result: gameMeta?.result ?? null,
            plyUserByPathKey,
        }
        const dirty = !studyPgnMatchesTree(
            effectiveSourcePgn,
            treeRoot,
            effectiveSourcePgn,
            options,
        )
        if (!dirty) return undefined
        const sourceMoves = extractMovetextFromPgn(effectiveSourcePgn)
        const exportedMoves = formatTreePgnMovetext(treeRoot, options)
        if (sourceMoves.includes('(') && !exportedMoves.includes('(')) {
            return undefined
        }

        const pgnText = buildStudyPgnFromTree(treeRoot, effectiveSourcePgn, options)
        saveCoachStudyDraft(gameId, pgnText)

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(async () => {
            if (savingRef.current) return
            if (
                studyPgnMatchesTree(
                    effectiveSourcePgn,
                    treeRoot,
                    effectiveSourcePgn,
                    options,
                )
            ) {
                return
            }
            const latest = buildStudyPgnFromTree(treeRoot, effectiveSourcePgn, options)
            if (!latest || latest === lastSavedRef.current) return
            savingRef.current = true
            try {
                const updated = await patchCoachGameStudyPgn(gameId, latest)
                lastSavedRef.current = latest
                clearCoachStudyDraft(gameId)
                onGameMetaChange?.({
                    ...(gameMeta || {}),
                    ...updated,
                    pgn: updated?.pgn ?? latest,
                })
            } catch {
                /* draft remains for session recovery */
            } finally {
                savingRef.current = false
            }
        }, AUTO_SAVE_MS)

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [
        gameId,
        treeRoot,
        effectiveSourcePgn,
        gameMeta,
        plyUserByPathKey,
        onGameMetaChange,
    ])
}
