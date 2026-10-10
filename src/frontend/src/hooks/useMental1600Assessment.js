import { useMemo } from 'react'
import { assessDecisionPoint, normalizeMentalAssessment } from '../utils/coachMental1600.js'
import { pathKeyFromPath } from '../utils/coachPlyClassification.js'
import { getNodeAtPath } from '../utils/coachVariationTree.js'

/**
 * FEAT-07 M-7 — assessment mental 1600 para el ply del cursor (cliente).
 *
 * @param {{
 *   treeRoot: object,
 *   cursorPath: number[],
 *   playerColor: 'white' | 'black',
 *   classificationByPathKey: Record<string, object>,
 *   gameMeta: object | null,
 *   cursorMoverElo: number | null,
 *   criticalMode?: boolean,
 *   serverMentalModel?: object | null,
 * }} params
 */
export function useMental1600Assessment({
    treeRoot,
    cursorPath,
    playerColor,
    classificationByPathKey,
    gameMeta,
    cursorMoverElo,
    criticalMode = false,
    serverMentalModel = null,
}) {
    return useMemo(() => {
        if (criticalMode && serverMentalModel) {
            return {
                assessment: normalizeMentalAssessment(serverMentalModel),
                emptyMessage: null,
                source: 'server',
            }
        }
        if (!cursorPath?.length) {
            return {
                assessment: null,
                emptyMessage: 'Posición inicial: avanzá en el PGN hasta una jugada tuya.',
                source: 'client',
            }
        }
        const parentPath = cursorPath.slice(0, -1)
        const parent = getNodeAtPath(treeRoot, parentPath)
        const cursorNode = getNodeAtPath(treeRoot, cursorPath)
        if (!parent?.fen || !cursorNode?.uci) {
            return { assessment: null, emptyMessage: null, source: 'client' }
        }
        const stm = (parent.fen.split(/\s+/)[1] || 'w').toLowerCase()
        const mover = stm === 'b' ? 'black' : 'white'
        if (mover !== playerColor) {
            return {
                assessment: null,
                emptyMessage:
                    'Esta jugada es del rival. Elegí una jugada tuya para ver el plan mental 1600.',
                source: 'client',
            }
        }
        const grandparentPath = parentPath.slice(0, -1)
        const grandparent = getNodeAtPath(treeRoot, grandparentPath)
        const lastOpponentMoveUci = parentPath.length > 0 ? parent.uci : null

        const pathKey = pathKeyFromPath(cursorPath)
        const classif = classificationByPathKey[pathKey]
        const scoreBefore = classif?.bestScore?.cp
        const scoreAfter = classif?.playedScore?.cp
        const topMovesUci =
            classif?.multipvMovesUci?.length > 0
                ? classif.multipvMovesUci
                : classif?.bestMoveUci
                  ? [classif.bestMoveUci]
                  : null
        const candidateCount = topMovesUci?.length >= 3 ? topMovesUci.length : null
        const timeControl =
            gameMeta?.time_control ?? gameMeta?.timeControl ?? gameMeta?.time_control_category ?? 'rapid'

        return {
            assessment: assessDecisionPoint({
                fen: parent.fen,
                timeControl,
                playerElo: cursorMoverElo,
                scoreDiffBefore: scoreBefore ?? null,
                scoreDiffAfter: scoreAfter ?? null,
                candidateCount,
                topMovesUci,
                playedMoveUci: cursorNode.uci,
                lastOpponentMoveUci: lastOpponentMoveUci || null,
                grandparentFen: grandparent?.fen ?? null,
            }),
            emptyMessage: null,
            source: 'client',
        }
    }, [
        criticalMode,
        serverMentalModel,
        cursorPath,
        treeRoot,
        playerColor,
        classificationByPathKey,
        cursorMoverElo,
        gameMeta,
    ])
}
