/** Format F07 review_pack player_score for display (player POV). */
export function formatPlayerEval(playerScore) {
    if (!playerScore) return '—'
    if (playerScore.kind === 'mate' || playerScore.mate != null) {
        const m = playerScore.mate
        return m > 0 ? `#${m}` : `#${m}`
    }
    const cp =
        playerScore.cp != null
            ? playerScore.cp
            : playerScore.as_cp_units != null
              ? playerScore.as_cp_units
              : null
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
