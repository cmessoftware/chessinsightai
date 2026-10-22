/** Centipawns from player POV (mate → signed magnitude for charts). */
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

/** Format F07 review_pack player_score for display (player POV). */
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
