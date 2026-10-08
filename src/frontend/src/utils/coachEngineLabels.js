/**
 * CA-1 — engine_label from cp_loss (ChessInsight spec §1).
 * Player POV; gap vs best alternative after each move (F07-019 style).
 */

/** @typedef {'white' | 'black'} PlayerColor */
/** @typedef {'cp' | 'mate'} ScoreKind */
/** @typedef {'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'pending'} EngineLabel */

/**
 * @typedef {Object} PlayerScore
 * @property {PlayerColor} playerColor
 * @property {ScoreKind} kind
 * @property {number | null} cp
 * @property {number | null} mate
 */

/**
 * @typedef {Object} EngineLabelThresholds
 * @property {number} inaccuracyMin  default 50
 * @property {number} mistakeMin     default 100
 * @property {number} blunderMin     default 300
 */

/** @typedef {'none' | 'missed_forced_mate' | 'allowed_opponent_mate' | 'mate_line_other' | 'unclear'} MateStatus */

export const DEFAULT_ENGINE_LABEL_THRESHOLDS = Object.freeze({
    inaccuracyMin: 50,
    mistakeMin: 100,
    blunderMin: 300,
})

/** ChessInsight §1 labels (not Lichess official). */
export const ENGINE_LABELS = Object.freeze([
    'good',
    'inaccuracy',
    'mistake',
    'blunder',
    'pending',
])

/** Optional PGN NAG-style suffixes for CA-3. */
export const ENGINE_LABEL_SYMBOLS = Object.freeze({
    good: '',
    inaccuracy: '?!',
    mistake: '?',
    blunder: '??',
    pending: '',
})

/**
 * @param {unknown} color
 * @returns {PlayerColor}
 */
export function parsePlayerColor(color) {
    if (color === 'black' || color === 'b' || color === 1 || color === 'Black') return 'black'
    return 'white'
}

/**
 * Engine score is White POV (UCI). Flip to analyzed player POV (F07-004).
 *
 * @param {{ kind: ScoreKind, whiteCp?: number | null, whiteMate?: number | null, playerColor: unknown }}
 * @returns {PlayerScore}
 */
export function normalizeFromWhitePov({ kind, whiteCp = null, whiteMate = null, playerColor }) {
    const player = parsePlayerColor(playerColor)
    if (player === 'white') {
        return {
            playerColor: 'white',
            kind,
            cp: kind === 'cp' ? whiteCp : null,
            mate: kind === 'mate' ? whiteMate : null,
        }
    }
    if (kind === 'mate' && whiteMate != null) {
        return { playerColor: 'black', kind: 'mate', cp: null, mate: -whiteMate }
    }
    return {
        playerColor: 'black',
        kind: 'cp',
        cp: whiteCp != null ? -whiteCp : null,
        mate: null,
    }
}

/**
 * Raw UCI cp/mate at `fen` (side to move) → analyzed player POV.
 *
 * @param {{ cp: number | null, mate: number | null, fen: string, playerColor: unknown }}
 * @returns {PlayerScore}
 */
export function scoreFromEngineLine({ cp, mate, fen, playerColor }) {
    const stm = (fen || '').split(/\s+/)[1] || 'w'
    const player = parsePlayerColor(playerColor)
    let ncp = cp
    let nmate = mate

    if (ncp != null || nmate != null) {
        const flipStm = stm === 'b'
        if (ncp != null) ncp = flipStm ? -ncp : ncp
        if (nmate != null) nmate = flipStm ? -nmate : nmate
        if (player === 'black') {
            if (ncp != null) ncp = -ncp
            if (nmate != null) nmate = -nmate
        }
    }

    if (nmate != null) {
        return { playerColor: player, kind: 'mate', cp: null, mate: nmate }
    }
    return { playerColor: player, kind: 'cp', cp: ncp, mate: null }
}

/**
 * @param {PlayerScore | null | undefined} score
 * @returns {boolean}
 */
export function isScoreComplete(score) {
    if (!score) return false
    if (score.kind === 'mate') return score.mate != null
    return score.cp != null
}

/**
 * Gap best − played in cp space (F07-019 `_eval_gap`). Only when both are cp.
 *
 * @param {PlayerScore} best
 * @param {PlayerScore} played
 * @returns {number | null}
 */
export function evalGapCpVsBest(best, played) {
    if (best.kind === 'mate' || played.kind === 'mate') return null
    if (best.cp == null || played.cp == null) return null
    return best.cp - played.cp
}

/**
 * @param {number | null} gapCp
 * @returns {number | null}
 */
export function cpLossFromGap(gapCp) {
    if (gapCp == null) return null
    return Math.max(0, gapCp)
}

/**
 * Spec §1: cp_loss = max(0, eval_best − eval_played) in player POV cp.
 *
 * @param {PlayerScore} bestScore  eval after best move
 * @param {PlayerScore} playedScore eval after played move
 * @returns {number | null}
 */
export function computeCpLoss(bestScore, playedScore) {
    assertSamePlayer(bestScore, playedScore)
    return cpLossFromGap(evalGapCpVsBest(bestScore, playedScore))
}

/**
 * @param {PlayerScore} best
 * @param {PlayerScore} played
 * @returns {MateStatus}
 */
export function deriveMateStatus(best, played) {
    const bestMate = best.kind === 'mate' ? best.mate : null
    const playedMate = played.kind === 'mate' ? played.mate : null
    const anyMate = bestMate != null || playedMate != null
    if (!anyMate) return 'none'

    if (playedMate != null && playedMate < 0) return 'allowed_opponent_mate'

    if (bestMate != null && bestMate > 0) {
        if (playedMate == null || playedMate <= 0) return 'missed_forced_mate'
        if (playedMate > 0 && playedMate !== bestMate) return 'mate_line_other'
    }

    if (bestMate != null || playedMate != null) return 'unclear'
    return 'none'
}

/**
 * @param {number | null} cpLoss
 * @param {EngineLabelThresholds} [thresholds]
 * @returns {EngineLabel}
 */
export function classifyCpLoss(cpLoss, thresholds = DEFAULT_ENGINE_LABEL_THRESHOLDS) {
    if (cpLoss == null || Number.isNaN(cpLoss)) return 'pending'
    if (cpLoss < thresholds.inaccuracyMin) return 'good'
    if (cpLoss < thresholds.mistakeMin) return 'inaccuracy'
    if (cpLoss < thresholds.blunderMin) return 'mistake'
    return 'blunder'
}

/**
 * Full move quality from best vs played evals (after respective moves, player POV).
 *
 * @param {{
 *   bestScore: PlayerScore,
 *   playedScore: PlayerScore,
 *   thresholds?: EngineLabelThresholds,
 * }} input
 * @returns {{
 *   engineLabel: EngineLabel,
 *   cpLoss: number | null,
 *   evalGapCp: number | null,
 *   mateStatus: MateStatus,
 *   reason: string | null,
 * }}
 */
export function classifyMoveFromEvals({ bestScore, playedScore, thresholds = DEFAULT_ENGINE_LABEL_THRESHOLDS }) {
    if (!isScoreComplete(bestScore) || !isScoreComplete(playedScore)) {
        return {
            engineLabel: 'pending',
            cpLoss: null,
            evalGapCp: null,
            mateStatus: 'unclear',
            reason: 'incomplete_score',
        }
    }

    assertSamePlayer(bestScore, playedScore)

    const mateStatus = deriveMateStatus(bestScore, playedScore)
    if (mateStatus !== 'none') {
        return {
            engineLabel: 'pending',
            cpLoss: null,
            evalGapCp: null,
            mateStatus,
            reason: 'mate_scores',
        }
    }

    const evalGapCp = evalGapCpVsBest(bestScore, playedScore)
    const cpLoss = cpLossFromGap(evalGapCp)
    return {
        engineLabel: classifyCpLoss(cpLoss, thresholds),
        cpLoss,
        evalGapCp,
        mateStatus: 'none',
        reason: null,
    }
}

/**
 * @param {PlayerScore} a
 * @param {PlayerScore} b
 */
function assertSamePlayer(a, b) {
    if (a.playerColor !== b.playerColor) {
        throw new Error(`player color mismatch: ${a.playerColor} vs ${b.playerColor}`)
    }
}

/**
 * @param {EngineLabel} label
 * @returns {string}
 */
export function engineLabelDisplayName(label) {
    const names = {
        good: 'Buena',
        inaccuracy: 'Imprecisión',
        mistake: 'Error',
        blunder: 'Error grave',
        pending: 'Pendiente',
    }
    return names[label] || label
}

/** Copy cuando `engine_label` queda pending (spec §1, mates). */
export function classificationPendingUserMessage(row) {
    if (!row) {
        return {
            title: 'Sin datos de clasificación',
            detail: 'Esta jugada aún no fue procesada por el motor en background.',
        }
    }
    const reason = row.reason || ''
    const mate = row.mateStatus

    if (reason === 'mate_scores' || mate === 'mate_line_other' || mate === 'unclear') {
        return {
            title: 'Mate en el motor',
            detail:
                'En posiciones con jaque mate no mostramos ?!/ ? / ?? por centipeones (spec §1). Podés ver eval y variante abajo cuando haya datos cp.',
        }
    }
    if (mate === 'missed_forced_mate') {
        return {
            title: 'Mate forzado no jugado',
            detail: 'El motor veía mate; la etiqueta cp no aplica. Revisá la variante sugerida.',
        }
    }
    if (mate === 'allowed_opponent_mate') {
        return {
            title: 'Mate rival posible',
            detail: 'Evaluación de mate en contra; sin etiqueta cp. Revisá defensas en la variante.',
        }
    }
    if (reason === 'engine_error') {
        return { title: 'Error del motor', detail: 'No se pudo clasificar esta jugada. Reintentá recargando la página.' }
    }
    if (reason === 'incomplete_score' || reason === 'no_engine_lines' || reason === 'no_played_eval') {
        return {
            title: 'Análisis incompleto',
            detail: 'El motor no devolvió evaluación suficiente para esta jugada.',
        }
    }
    return {
        title: 'Clasificación pendiente',
        detail: reason ? `Motivo técnico: ${reason}.` : 'Esperando resultado del análisis en background.',
    }
}

/** Barra global CA-2 (línea principal). */
export function formatClassificationProgressLabel(progress) {
    if (!progress?.total) return null
    const { done, total, status, error } = progress
    if (status === 'error') {
        return error ? `Clasificación interrumpida: ${error}` : 'Clasificación interrumpida.'
    }
    if (status === 'running') {
        return `Análisis en background: ${done}/${total} jugadas de la línea principal…`
    }
    if (status === 'done') {
        return `Análisis en background completo (${total}/${total} jugadas).`
    }
    return null
}
