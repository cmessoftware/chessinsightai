/**
 * CA-5 v1 — impacto pedagógico contextual (spec §3, §212).
 * Umbrales de situación dependen del Elo del jugador (validación HITL pendiente).
 */

/** @typedef {'unknown' | 'losing' | 'decisive_disadvantage' | 'disadvantage' | 'slight_disadvantage' | 'equal' | 'slight_advantage' | 'advantage' | 'decisive_advantage' | 'winning'} PositionSituation */

/** @typedef {'neutral' | 'decisive_advantage_kept' | 'advantage_reduced' | 'advantage_lost' | 'equal_deteriorated' | 'winning_to_losing' | 'already_losing_worse' | 'unknown'} PedagogicalImpactId */

/**
 * @typedef {Object} PositionThresholdsV1
 * @property {number} winningCp       mínimo cp POV jugador = "ganada"
 * @property {number} decisiveCp      mínimo cp = "ventaja decisiva" (p. ej. +5 @ ~1600, +2 @ 2400)
 * @property {number} clearAdvantageCp mínimo cp = ventaja clara
 * @property {number} equalBandCp     |cp| ≤ banda = "igualada"
 */

/** @typedef {{ maxElo: number, label: string, thresholds: PositionThresholdsV1 }} EloBandConfig */

/** Umbrales v1 provisionales — ajustar con HITL (BUG-12 / CA-8). */
export const ELO_POSITION_BANDS_V1 = Object.freeze([
    {
        maxElo: 1199,
        label: '<1200',
        thresholds: { winningCp: 700, decisiveCp: 550, clearAdvantageCp: 180, equalBandCp: 55 },
    },
    {
        maxElo: 1599,
        label: '1200–1599',
        thresholds: { winningCp: 650, decisiveCp: 500, clearAdvantageCp: 150, equalBandCp: 50 },
    },
    {
        maxElo: 1999,
        label: '1600–1999',
        thresholds: { winningCp: 600, decisiveCp: 500, clearAdvantageCp: 130, equalBandCp: 45 },
    },
    {
        maxElo: 2399,
        label: '2000–2399',
        thresholds: { winningCp: 550, decisiveCp: 500, clearAdvantageCp: 100, equalBandCp: 40 },
    },
    {
        maxElo: Infinity,
        label: '≥2400',
        thresholds: { winningCp: 500, decisiveCp: 200, clearAdvantageCp: 80, equalBandCp: 35 },
    },
])

const DEFAULT_BAND = ELO_POSITION_BANDS_V1[2]

/**
 * @param {number | null | undefined} playerElo
 * @returns {{ bandLabel: string, thresholds: PositionThresholdsV1 }}
 */
export function getPositionThresholdsForElo(playerElo) {
    const elo = playerElo != null && playerElo > 0 ? playerElo : null
    if (elo == null) {
        return { bandLabel: DEFAULT_BAND.label, thresholds: { ...DEFAULT_BAND.thresholds } }
    }
    const band = ELO_POSITION_BANDS_V1.find((b) => elo <= b.maxElo) || DEFAULT_BAND
    return { bandLabel: band.label, thresholds: { ...band.thresholds } }
}

/**
 * @param {number | null | undefined} cp
 * @param {PositionThresholdsV1} thresholds
 * @returns {PositionSituation}
 */
export function classifyPositionSituation(cp, thresholds) {
    if (cp == null || Number.isNaN(cp)) return 'unknown'
    const t = thresholds
    if (cp >= t.winningCp) return 'winning'
    if (cp >= t.decisiveCp) return 'decisive_advantage'
    if (cp >= t.clearAdvantageCp) return 'advantage'
    if (cp > t.equalBandCp) return 'slight_advantage'
    if (cp >= -t.equalBandCp) return 'equal'
    if (cp >= -t.clearAdvantageCp) return 'slight_disadvantage'
    if (cp >= -t.decisiveCp) return 'disadvantage'
    if (cp >= -t.winningCp) return 'decisive_disadvantage'
    return 'losing'
}

const SITUATION_LEVEL = Object.freeze({
    winning: 5,
    decisive_advantage: 4,
    advantage: 3,
    slight_advantage: 2,
    equal: 1,
    slight_disadvantage: 0,
    disadvantage: -1,
    decisive_disadvantage: -2,
    losing: -3,
    unknown: null,
})

/**
 * @param {number | null | undefined} cp
 * @returns {string}
 */
export function formatCpPawnsShort(cp) {
    if (cp == null || Number.isNaN(cp)) return '—'
    const pawns = cp / 100
    if (Math.abs(pawns) < 0.05) return '0'
    return (pawns > 0 ? '+' : '') + pawns.toFixed(1)
}

/**
 * v1: compara eval tras la mejor candidata vs tras la jugada (misma búsqueda en fenBefore).
 *
 * @param {{
 *   evalBeforeCp: number | null,
 *   evalAfterCp: number | null,
 *   cpLoss: number | null,
 *   playerElo?: number | null,
 * }} input
 * @returns {{
 *   pedagogicalImpact: PedagogicalImpactId,
 *   pedagogicalImpactMessage: string,
 *   pedagogicalImpactEloBand: string,
 *   thresholdHint: string,
 *   situationBefore: PositionSituation,
 *   situationAfter: PositionSituation,
 * }}
 */
export function derivePedagogicalImpactV1({
    evalBeforeCp,
    evalAfterCp,
    cpLoss,
    playerElo = null,
}) {
    const { bandLabel, thresholds } = getPositionThresholdsForElo(playerElo)
    const thresholdHint = `Umbrales v1 (Elo ${bandLabel}): decisivo ≥ ${formatCpPawnsShort(thresholds.decisiveCp)} · ganada ≥ ${formatCpPawnsShort(thresholds.winningCp)}`

    if (evalBeforeCp == null || evalAfterCp == null) {
        return {
            pedagogicalImpact: 'unknown',
            pedagogicalImpactMessage: 'Impacto: sin evaluación cp suficiente.',
            pedagogicalImpactEloBand: bandLabel,
            thresholdHint,
            situationBefore: 'unknown',
            situationAfter: 'unknown',
        }
    }

    const before = classifyPositionSituation(evalBeforeCp, thresholds)
    const after = classifyPositionSituation(evalAfterCp, thresholds)
    const beforeL = SITUATION_LEVEL[before]
    const afterL = SITUATION_LEVEL[after]
    const drop = beforeL != null && afterL != null ? beforeL - afterL : 0
    const loss = cpLoss != null && cpLoss >= 0 ? cpLoss : 0

    /** @type {PedagogicalImpactId} */
    let id = 'neutral'
    /** @type {string} */
    let message = 'Impacto: cambio acotado en la evaluación.'

    if (beforeL != null && afterL != null && beforeL >= 4 && afterL >= 4 && drop <= 1 && loss >= 50) {
        id = 'decisive_advantage_kept'
        message =
            'Impacto: ventaja decisiva conservada — la jugada redujo la evaluación, pero seguís claramente favorable.'
    } else if (beforeL != null && afterL != null && beforeL >= 3 && afterL <= 1 && drop >= 2) {
        id = 'advantage_lost'
        message = 'Impacto: ventaja desaprovechada — el rival puede neutralizar lo que tenías.'
    } else if (beforeL != null && afterL != null && beforeL >= 4 && afterL <= 0 && drop >= 3) {
        id = 'winning_to_losing'
        message = 'Impacto: error decisivo — pasaste de una posición muy favorable a claramente peor.'
    } else if (beforeL != null && afterL != null && beforeL >= 1 && afterL <= -1 && drop >= 2) {
        id = 'equal_deteriorated'
        message = 'Impacto: la posición pasó de equilibrada a inferior.'
    } else if (beforeL != null && afterL != null && beforeL <= -1 && afterL < beforeL && drop >= 1) {
        id = 'already_losing_worse'
        message = 'Impacto: agrava una posición ya desfavorable.'
    } else if (beforeL != null && afterL != null && beforeL >= 3 && afterL >= 2 && drop === 1 && loss >= 50) {
        id = 'advantage_reduced'
        message = 'Impacto: redujiste ventaja, pero conservás iniciativa.'
    } else if (loss >= 300 && beforeL != null && afterL != null && afterL >= 4) {
        id = 'decisive_advantage_kept'
        message =
            'Impacto: pérdida numérica alta, pero la evaluación sigue en zona de ventaja decisiva para tu Elo.'
    }

    return {
        pedagogicalImpact: id,
        pedagogicalImpactMessage: message,
        pedagogicalImpactEloBand: bandLabel,
        thresholdHint,
        situationBefore: before,
        situationAfter: after,
    }
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {number | null | undefined} playerElo
 * @returns {Record<string, unknown>}
 */
export function enrichClassificationWithPedagogy(row, playerElo) {
    if (!row) return row
    const bestCp = row.bestScore?.kind === 'cp' ? row.bestScore.cp : null
    const playedCp = row.playedScore?.kind === 'cp' ? row.playedScore.cp : null
    const ped = derivePedagogicalImpactV1({
        evalBeforeCp: bestCp,
        evalAfterCp: playedCp,
        cpLoss: row.cpLoss,
        playerElo,
    })
    return { ...row, ...ped }
}
