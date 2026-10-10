/** User-facing note when a multi-game PGN was truncated on import. */
export function pgnMultiGameImportNotice(apiResult) {
    const total = apiResult?.pgn_total_games
    if (typeof total === 'number' && total > 1) {
        return `Se cargó solo la primera partida del PGN (${total} en total).`
    }
    return null
}
