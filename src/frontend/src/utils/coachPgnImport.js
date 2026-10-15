/** Hard cap per Coach import batch (future: admin module). */
export const COACH_PGN_IMPORT_MAX_GAMES = 100

/** User-facing note when a multi-game PGN was truncated on import. */
export function pgnMultiGameImportNotice(apiResult) {
    const total = apiResult?.pgn_total_games
    const ignored = apiResult?.pgn_games_ignored
    const imported = apiResult?.count ?? apiResult?.games?.length

    if (typeof ignored === 'number' && ignored > 0 && typeof total === 'number') {
        return `El PGN tiene ${total} partida(s); se importaron ${imported} (máximo ${COACH_PGN_IMPORT_MAX_GAMES} por importación).`
    }
    return null
}
