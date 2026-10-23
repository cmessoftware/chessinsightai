import { parsePlayerColor } from './coachEngineLabels.js'

/** Centipawns from score object (mate → signed magnitude for charts). */
export function playerScoreToCp(playerScore) {
    if (!playerScore) return null
    if (playerScore.kind === 'mate' || playerScore.mate != null) {
        const m = Number(playerScore.mate)
        if (!Number.isFinite(m) || m === 0) return null
        return m > 0 ? 100 : -100
    }
    const cp =
        playerScore.cp != null
            ? playerScore.cp
            : playerScore.as_cp_units != null
              ? playerScore.as_cp_units
              : null
    return cp != null && Number.isFinite(cp) ? cp : null
}

/**
 * Lichess-style eval: + = blancas, − = negras (independiente del jugador analizado).
 * @param {import('./coachEngineLabels.js').PlayerScore | null | undefined} playerScore
 */
export function toWhiteStandardScore(playerScore) {
    if (!playerScore) return null
    const pov =
        playerScore.playerColor != null ? parsePlayerColor(playerScore.playerColor) : 'white'
    if (pov === 'white') {
        return { ...playerScore, playerColor: 'white' }
    }
    if (playerScore.kind === 'mate' || playerScore.mate != null) {
        const m = playerScore.mate
        return {
            playerColor: 'white',
            kind: 'mate',
            cp: null,
            mate: m != null ? -m : null,
        }
    }
    const cp = playerScoreToCp(playerScore)
    return {
        playerColor: 'white',
        kind: 'cp',
        cp: cp != null ? -cp : null,
        mate: null,
    }
}

/** UI / PGN / gráfico: eval estándar (+ blancas, − negras). */
export function formatStandardEval(playerScore) {
    return formatPlayerEval(toWhiteStandardScore(playerScore))
}

/** Format numeric score (cp already in chosen POV). */
export function formatPlayerEval(playerScore) {
    if (!playerScore) return '—'
    if (playerScore.kind === 'mate' || playerScore.mate != null) {
        const m = playerScore.mate
        return m > 0 ? `#${m}` : `#${m}`
    }
    const cp = playerScoreToCp(playerScore)
    if (cp == null) return '—'
    const pawns = cp / 100
    if (Math.abs(pawns) < 0.005) return '0.00'
    return (pawns > 0 ? '+' : '') + pawns.toFixed(2)
}

/** One-line SAN continuation (Lichess / Chess.com style). */
export function formatPvOneLine(candidate) {
    if (!candidate) return ''
    const head = candidate.san || candidate.uci || ''
    const pv = Array.isArray(candidate.pv_san) ? candidate.pv_san : []
    if (!pv.length) return head
    if (head && pv[0] !== head) {
        return [head, ...pv].join(' ')
    }
    return pv.join(' ')
}
