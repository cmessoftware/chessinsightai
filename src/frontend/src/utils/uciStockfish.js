import { Chess } from 'chess.js'

/** Extract latest MultiPV rows from UCI info lines (one pass, last depth wins per rank). */
export function parseMultipvFromInfoLines(lines) {
    const byRank = new Map()
    for (const line of lines) {
        if (!line.startsWith('info ')) continue
        const rankMatch = /multipv (\d+)/.exec(line)
        if (!rankMatch) continue
        const rank = Number(rankMatch[1])
        const depthMatch = /depth (\d+)/.exec(line)
        const cpMatch = /score cp (-?\d+)/.exec(line)
        const mateMatch = /score mate (-?\d+)/.exec(line)
        const pvMatch = / pv (.+)$/.exec(line)
        if (!pvMatch) continue
        byRank.set(rank, {
            rank,
            depth: depthMatch ? Number(depthMatch[1]) : 0,
            cp: cpMatch ? Number(cpMatch[1]) : null,
            mate: mateMatch ? Number(mateMatch[1]) : null,
            pvUci: pvMatch[1].trim().split(/\s+/),
        })
    }
    return [...byRank.values()].sort((a, b) => a.rank - b.rank)
}

export function uciPvToSan(fen, pvUci) {
    if (!fen || !pvUci?.length) return []
    const chess = new Chess(fen)
    const out = []
    for (const uci of pvUci) {
        if (uci.length < 4) break
        const move = chess.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.length > 4 ? uci[4] : undefined,
        })
        if (!move) break
        out.push(move.san)
    }
    return out
}
