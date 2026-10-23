import { parsePlayerColor } from './coachEngineLabels.js'

/** Tope del eje Y del gráfico CP (FEAT-047 / BUG-060). */
export const CP_CHART_MAX_CP = 2000

/** Centipawns from score object (mate → no cp numérico; usar playerScoreToChartCp). */
export function playerScoreToCp(playerScore) {
    if (!playerScore) return null
    if (playerScore.kind === 'mate' || playerScore.mate != null) {
        return null
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

/**
 * Mate en plies (POV blancas: +N = blancas dan mate en N) → Y del gráfico cerca de ±2000 cp.
 * M1 arriba del todo; M2, M3… un poco menos, sin acercarse a 0.
 */
export function mateScoreToChartCp(mate) {
    const m = Number(mate)
    if (!Number.isFinite(m) || m === 0) return null
    const absM = Math.min(Math.abs(m), 40)
    const magnitude = Math.min(
        CP_CHART_MAX_CP,
        Math.max(1600, CP_CHART_MAX_CP - (absM - 1) * 40),
    )
    return m > 0 ? magnitude : -magnitude
}

/** Valor Y para el gráfico CP: cp clamp ±2000; mate → banda ganadora (no ~0). */
export function playerScoreToChartCp(playerScore) {
    if (!playerScore) return null
    const std =
        playerScore.playerColor != null || playerScore.kind != null
            ? toWhiteStandardScore(playerScore)
            : playerScore
    if (!std) return null
    if (std.kind === 'mate' || std.mate != null) {
        return mateScoreToChartCp(std.mate)
    }
    const cp =
        std.cp != null && Number.isFinite(std.cp)
            ? std.cp
            : playerScoreToCp(std)
    if (cp == null || !Number.isFinite(cp)) return null
    return Math.max(-CP_CHART_MAX_CP, Math.min(CP_CHART_MAX_CP, cp))
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
