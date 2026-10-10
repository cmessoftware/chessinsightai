/**
 * FEAT-07 / M-1…M-4 — Modelo mental 1600 rapid (cliente, chess.js).
 * Paridad orientativa con docs/ai_chess_coach_course/analysis/mental_model/flow.py
 */

import { Chess } from 'chess.js'

export const MENTAL_MODEL_RULES_VERSION = 'v1'

const PAUSE_BY_TIME_CONTROL = {
    bullet: 5,
    blitz: 5,
    rapid: 10,
    classical: 30,
}

const FAST_PATH_EVAL_DELTA = 40
const EVAL_SHIFT_CP = 80

const TRIGGER_LABELS = {
    E1: 'Material aparentemente gratis o pieza en prise',
    E2: 'Jaque, captura o amenaza directa',
    E3: 'Jugada inesperada del rival',
    E4: 'Avance de peón con tempo sobre una pieza',
    E5: 'Se abre o cierra columna, diagonal o fila',
    E6: 'Cambio importante de estructura de peones',
    E7: 'Ataque al rey o reyes expuestos',
    E8: 'Pieza sin defensor o presionada',
    E9: 'Jugada irreversible (avance, captura mayor, cambio)',
    E10: 'Varias candidatas razonables',
    E11: 'La evaluación cambió: tranquilo ↔ táctico',
}

const HUMAN_TO_07 = {
    E1: ['TacticalThreat', 'MaterialTransformation'],
    E2: ['TacticalThreat', 'ForcedSequence'],
    E3: ['EvaluationInstability', 'PlanTransition'],
    E4: ['TacticalThreat'],
    E5: ['StructuralTransformation', 'PawnBreakAvailable'],
    E6: ['StructuralTransformation'],
    E7: ['KingSafetyChange', 'TacticalThreat'],
    E8: ['TacticalThreat'],
    E9: ['IrreversiblePawnMove', 'MaterialTransformation'],
    E10: ['CandidateDivergence'],
    E11: ['EvaluationInstability'],
}

const THINKING_PLAN_CRITICAL = [
    { node_id: 'F', prompt_es: 'Detener automatismo — usar pausa sugerida', phase: 'critical' },
    { node_id: 'G1', prompt_es: '¿Qué amenaza realmente la última jugada?', phase: 'update' },
    { node_id: 'G2', prompt_es: '¿Qué cambió respecto al movimiento anterior?', phase: 'update' },
    { node_id: 'G3', prompt_es: '¿Qué quedó atacado o indefenso?', phase: 'update' },
    { node_id: 'G4', prompt_es: '¿Qué líneas se abrieron o cerraron?', phase: 'update' },
    {
        node_id: 'D',
        prompt_es: 'Generar candidatas: forzantes → amenazas → activas → profilácticas → posicionales',
        phase: 'candidates',
    },
    { node_id: 'E', prompt_es: 'Reducir a 2–3 candidatas reales', phase: 'candidates' },
    { node_id: 'G', prompt_es: 'Calcular: mi jugada → respuesta rival → mi continuación', phase: 'calculate' },
    { node_id: 'I', prompt_es: 'Evaluar: rey, material, actividad, estructura, iniciativa práctica', phase: 'evaluate' },
    { node_id: 'J', prompt_es: 'Comparar candidatas', phase: 'evaluate' },
    { node_id: 'S', prompt_es: 'Chequeo final anti-blunder (S1–S4)', phase: 'check' },
]

const THINKING_PLAN_FAST = [
    { node_id: 'C', prompt_es: 'Modo rápido — buscar jugada natural', phase: 'fast' },
    { node_id: 'C1', prompt_es: '¿Mi jugada natural es segura y coherente?', phase: 'fast' },
]

export const ANTI_BLUNDER_LABELS = {
    S1: 'Dama o torre queda colgando',
    S2: 'Dejás al rey en jaque',
    S3: 'Permitís captura obvia de pieza mayor',
    S4: 'Perdés defensor clave',
}

const CANDIDATE_PRIORITY = { D1: 0, D2: 1, D3: 2, D4: 3, D5: 4 }

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const CENTER_FILES = new Set(['c', 'd', 'e', 'f'])
const CENTER_RANKS = new Set(['3', '4', '5', '6'])

function squareName(sq) {
    return sq
}

function isAttackedBy(chess, square, color) {
    const moves = chess.moves({ verbose: true })
    return moves.some((m) => m.to === square && m.color === color)
}

/** @returns {{ square: string, piece: string }[]} */
function attackedUndefended(chess, victimColor, minValue = 1) {
    const attackerColor = victimColor === 'w' ? 'b' : 'w'
    const board = chess.board()
    const out = []
    for (let r = 0; r < 8; r += 1) {
        for (let f = 0; f < 8; f += 1) {
            const cell = board[r][f]
            if (!cell || cell.color !== victimColor) continue
            const val = PIECE_VALUE[cell.type] ?? 0
            if (val < minValue || cell.type === 'k') continue
            const sq = `${String.fromCharCode(97 + f)}${8 - r}`
            if (isAttackedBy(chess, sq, attackerColor) && !isAttackedBy(chess, sq, victimColor)) {
                out.push({ square: sq, piece: cell.type })
            }
        }
    }
    return out
}

function pieceNameEs(type) {
    const map = { p: 'peón', n: 'caballo', b: 'alfil', r: 'torre', q: 'dama', k: 'rey' }
    return map[type] || type
}

function detectTriggers(chess, { scoreDiffBefore, scoreDiffAfter, candidateCount }) {
    /** @type {{ code: string, label_es: string, confidence: number, evidence: string[] }[]} */
    const triggers = []
    const player = chess.turn()
    const opponent = player === 'w' ? 'b' : 'w'

    const hangingOpp = attackedUndefended(chess, opponent, 1)
    if (hangingOpp.length) {
        triggers.push({
            code: 'E1',
            label_es: TRIGGER_LABELS.E1,
            confidence: 0.85,
            evidence: hangingOpp.slice(0, 3).map(
                ({ square, piece }) => `${pieceNameEs(piece)} rival en ${square} sin defensa adecuada`,
            ),
        })
    }

    const forcing = []
    if (chess.inCheck()) forcing.push('Estás en jaque')
    const history = chess.history({ verbose: true })
    const last = history[history.length - 1]
    if (last) {
        if (last.captured) forcing.push(`La última jugada fue captura (${last.from}${last.to})`)
        if (last.san.includes('+')) forcing.push('La última jugada dio jaque')
    }

    const threats = []
    const kingSq = findKingSquare(chess, player)
    if (kingSq && isAttackedBy(chess, kingSq, opponent)) {
        threats.push(`Tu rey en ${kingSq} está atacado`)
    }
    for (const { square, piece } of attackedUndefended(chess, player, 3).slice(0, 4)) {
        threats.push(`Tu ${pieceNameEs(piece)} en ${square} está atacada`)
    }

    if (forcing.length || threats.length) {
        triggers.push({
            code: 'E2',
            label_es: TRIGGER_LABELS.E2,
            confidence: 0.9,
            evidence: [...forcing, ...threats].slice(0, 4),
        })
    }

    if (last?.piece === 'p') {
        try {
            const afterPawn = new Chess(chess.fen())
            afterPawn.move({ from: last.from, to: last.to, promotion: last.promotion })
            const movesFromPawn = afterPawn.moves({ verbose: true, square: last.to })
            const tempoHits = movesFromPawn.filter((m) => m.captured)
            if (tempoHits.length) {
                triggers.push({
                    code: 'E4',
                    label_es: TRIGGER_LABELS.E4,
                    confidence: 0.82,
                    evidence: tempoHits.slice(0, 2).map(
                        (m) =>
                            `Peón en ${last.to} ataca ${pieceNameEs(m.captured)} en ${m.to}`,
                    ),
                })
            }
        } catch {
            /* ignore */
        }
    }

    if (last?.captured === 'p') {
        triggers.push({
            code: 'E6',
            label_es: TRIGGER_LABELS.E6,
            confidence: 0.7,
            evidence: [`Cambio de estructura: captura de peón en ${last.to}`],
        })
    }
    if (last?.captured && ['n', 'b', 'r', 'q'].includes(last.captured)) {
        triggers.push({
            code: 'E9',
            label_es: TRIGGER_LABELS.E9,
            confidence: 0.75,
            evidence: ['Captura de pieza mayor o cambio material'],
        })
    }

    if (kingSq) {
        const attackers = chess.moves({ verbose: true }).filter((m) => m.to === kingSq).length
        if (attackers >= 1) {
            triggers.push({
                code: 'E7',
                label_es: TRIGGER_LABELS.E7,
                confidence: 0.8,
                evidence: [`Rey expuesto en ${kingSq}`],
            })
        }
    }

    const ownHang = attackedUndefended(chess, player, 3)
    if (ownHang.length) {
        const { square, piece } = ownHang[0]
        triggers.push({
            code: 'E8',
            label_es: TRIGGER_LABELS.E8,
            confidence: 0.78,
            evidence: [`Tu ${pieceNameEs(piece)} en ${square} sin defensa`],
        })
    }

    if (scoreDiffBefore != null && scoreDiffAfter != null) {
        const delta = Math.abs(Number(scoreDiffAfter) - Number(scoreDiffBefore))
        if (delta >= EVAL_SHIFT_CP) {
            triggers.push({
                code: 'E11',
                label_es: TRIGGER_LABELS.E11,
                confidence: Math.min(0.95, 0.6 + delta / 400),
                evidence: [`Cambio de eval ≈ ${Math.round(delta)} cp`],
            })
        }
    }

    if (candidateCount != null && candidateCount >= 3) {
        triggers.push({
            code: 'E10',
            label_es: TRIGGER_LABELS.E10,
            confidence: 0.7,
            evidence: [`${candidateCount} candidatas con evaluaciones cercanas`],
        })
    }

    const byCode = new Map()
    for (const t of triggers) {
        const prev = byCode.get(t.code)
        if (!prev || t.confidence > prev.confidence) byCode.set(t.code, t)
    }
    return [...byCode.values()]
}

function findKingSquare(chess, color) {
    const board = chess.board()
    for (let r = 0; r < 8; r += 1) {
        for (let f = 0; f < 8; f += 1) {
            const cell = board[r][f]
            if (cell && cell.type === 'k' && cell.color === color) {
                return `${String.fromCharCode(97 + f)}${8 - r}`
            }
        }
    }
    return null
}

export function parseTimeControlCategory(raw) {
    const s = String(raw || '').toLowerCase()
    if (s.includes('bullet') || /^[12]\+\d/.test(s)) return 'bullet'
    if (s.includes('blitz') || /^[35]\+\d/.test(s)) return 'blitz'
    if (s.includes('classical') || s.includes('daily')) return 'classical'
    return 'rapid'
}

export function suggestPauseSeconds(timeControl = 'rapid', playerElo = 1600) {
    const base = PAUSE_BY_TIME_CONTROL[parseTimeControlCategory(timeControl)] ?? 10
    if (playerElo < 1400) return Math.max(5, base - 2)
    if (playerElo >= 1800) return base + 5
    return base
}

export function classifyCandidateMove(chess, moveVerbose) {
    if (moveVerbose.captured || moveVerbose.san?.includes('+')) return 'D1'
    const trial = new Chess(chess.fen())
    trial.move({ from: moveVerbose.from, to: moveVerbose.to, promotion: moveVerbose.promotion })
    const opponent = chess.turn() === 'w' ? 'b' : 'w'
    const createsThreat = trial.moves({ verbose: true }).some((m) => {
        const target = trial.get(m.to)
        return target && target.color === opponent && target.type !== 'k'
    })
    if (createsThreat) return 'D2'
    if (moveVerbose.piece === 'p') return 'D3'
    if (['n', 'b', 'r'].includes(moveVerbose.piece)) return 'D3'
    return 'D5'
}

function mapTriggersTo07(codes) {
    const seen = new Set()
    const ordered = []
    for (const code of codes) {
        for (const reason of HUMAN_TO_07[code] || []) {
            if (!seen.has(reason)) {
                seen.add(reason)
                ordered.push(reason)
            }
        }
    }
    return ordered
}

function isCenterSquare(sq) {
    if (!sq || sq.length < 2) return false
    return CENTER_FILES.has(sq[0]) && CENTER_RANKS.has(sq[1])
}

function findVerboseMove(chess, uci) {
    if (!uci || uci.length < 4) return null
    const norm = uci.toLowerCase()
    return (
        chess.moves({ verbose: true }).find(
            (m) => `${m.from}${m.to}${m.promotion || ''}`.toLowerCase() === norm,
        ) || null
    )
}

/** @returns {{ kind: string, evidence: string }[]} */
export function detectNotableCritical(chess, lastMoveVerbose = null) {
    /** @type {{ kind: string, evidence: string }[]} */
    const reasons = []
    const seen = new Set()

    const add = (kind, evidence) => {
        if (seen.has(kind)) return
        seen.add(kind)
        reasons.push({ kind, evidence })
    }

    const history = chess.history({ verbose: true })
    const last = lastMoveVerbose || history[history.length - 1]
    if (last?.captured) {
        const toSq = last.to
        const recaptures = chess.moves({ verbose: true }).filter((m) => m.captured && m.to === toSq)
        const capturedVal = PIECE_VALUE[last.captured] ?? 0
        if (recaptures.length >= 2) {
            add('recapture_choice', `Retomar en ${toSq} de ${recaptures.length} maneras`)
        } else if (recaptures.length >= 1 && isCenterSquare(toSq)) {
            add('recapture_choice', `Retomar o no en el centro (${toSq})`)
        }
        if (last.captured === 'p') {
            add('pawn_structure', `Última jugada cambió peones en ${toSq}`)
        }
        if (capturedVal >= 3) {
            add('piece_exchange', `Cambio de pieza en ${toSq}`)
        }
        if (isCenterSquare(toSq)) {
            add('center_decision', `Contacto en el centro (${toSq})`)
        }
    }

    if (chess.inCheck()) {
        add('tactical_mess', 'Jaque — hay que resolver sí o sí')
    }

    const player = chess.turn()
    for (const { square, piece } of attackedUndefended(chess, player === 'w' ? 'b' : 'w', 5)) {
        if (PIECE_VALUE[piece] >= 5) {
            add(
                'tactical_mess',
                `Puede tomar ${pieceNameEs(piece)} en ${square} sin defensor`,
            )
            break
        }
    }

    return reasons
}

function defenderCount(chess, color) {
    let count = 0
    const board = chess.board()
    for (let r = 0; r < 8; r += 1) {
        for (let f = 0; f < 8; f += 1) {
            const cell = board[r][f]
            if (!cell || cell.color !== color || !['q', 'r', 'b', 'n'].includes(cell.type)) continue
            const sq = `${String.fromCharCode(97 + f)}${8 - r}`
            if (isAttackedBy(chess, sq, color)) count += 1
        }
    }
    return count
}

/** @returns {string[]} failed S1–S4 codes */
export function runAntiBlunderChecks(chess, moveVerbose) {
    if (!moveVerbose) return ['S1']
    const player = chess.turn()
    const trial = new Chess(chess.fen())
    const moved = trial.move({
        from: moveVerbose.from,
        to: moveVerbose.to,
        promotion: moveVerbose.promotion,
    })
    if (!moved) return ['S1']

    /** @type {string[]} */
    const failed = []
    if (trial.inCheck()) failed.push('S2')

    const majorHang = attackedUndefended(trial, player, 5)
    if (majorHang.length) failed.push('S1')

    const opponent = player === 'w' ? 'b' : 'w'
    const oppMoves = trial.moves({ verbose: true })
    if (
        oppMoves.some((m) => {
            if (!m.captured) return false
            const val = PIECE_VALUE[m.captured] ?? 0
            return val >= 5
        })
    ) {
        failed.push('S3')
    }

    const beforeDef = defenderCount(chess, player)
    const afterDef = defenderCount(trial, player)
    if (afterDef < beforeDef - 1) failed.push('S4')

    return [...new Set(failed)]
}

export function orderTopMovesByCategory(chess, topMovesUci) {
    const tagged = []
    for (const uci of topMovesUci || []) {
        if (!uci || uci.length < 4) continue
        const moves = chess.moves({ verbose: true })
        const match = moves.find(
            (m) => `${m.from}${m.to}${m.promotion || ''}`.toLowerCase() === uci.toLowerCase(),
        )
        if (!match) continue
        const category = classifyCandidateMove(chess, match)
        tagged.push({ uci: uci.toLowerCase(), category })
    }
    tagged.sort(
        (a, b) => (CANDIDATE_PRIORITY[a.category] ?? 9) - (CANDIDATE_PRIORITY[b.category] ?? 9),
    )
    return tagged
}

/**
 * @param {{
 *   fen: string,
 *   timeControl?: string,
 *   playerElo?: number | null,
 *   scoreDiffBefore?: number | null,
 *   scoreDiffAfter?: number | null,
 *   candidateCount?: number | null,
 *   topMovesUci?: string[] | null,
 *   playedMoveUci?: string | null,
 *   lastOpponentMoveUci?: string | null,
 *   grandparentFen?: string | null,
 * }} input
 */
export function assessDecisionPoint({
    fen,
    timeControl = 'rapid',
    playerElo = 1600,
    scoreDiffBefore = null,
    scoreDiffAfter = null,
    candidateCount = null,
    topMovesUci = null,
    playedMoveUci = null,
    lastOpponentMoveUci = null,
    grandparentFen = null,
}) {
    const chess = new Chess(fen)
    let lastOpponentVerbose = null
    if (lastOpponentMoveUci && grandparentFen) {
        const prior = new Chess(grandparentFen)
        lastOpponentVerbose = findVerboseMove(prior, lastOpponentMoveUci)
    }
    const triggers = detectTriggers(chess, { scoreDiffBefore, scoreDiffAfter, candidateCount })
    const notable = detectNotableCritical(chess, lastOpponentVerbose)

    let evalDelta = null
    if (scoreDiffBefore != null && scoreDiffAfter != null) {
        evalDelta = Math.abs(Number(scoreDiffAfter) - Number(scoreDiffBefore))
    }
    const evalDrop = evalDelta != null && evalDelta >= FAST_PATH_EVAL_DELTA
    const critical = evalDrop || notable.length > 0

    const elo = playerElo ?? 1600
    /** @type {Record<string, unknown>} */
    const meta = {
        rules_version: MENTAL_MODEL_RULES_VERSION,
        fen: chess.fen(),
        side_to_move: chess.turn() === 'w' ? 'white' : 'black',
        legal_moves: chess.moves().length,
        notable: notable.map((n) => n.kind),
    }

    const ordered = orderTopMovesByCategory(chess, topMovesUci)
    if (ordered.length) meta.ordered_candidates = ordered

    let antiBlunderFailed = []
    if (playedMoveUci) {
        const moves = chess.moves({ verbose: true })
        const played = moves.find(
            (m) =>
                `${m.from}${m.to}${m.promotion || ''}`.toLowerCase() === playedMoveUci.toLowerCase(),
        )
        if (played) {
            antiBlunderFailed = runAntiBlunderChecks(chess, played)
            meta.move_uci = playedMoveUci.toLowerCase()
            meta.anti_blunder_failed = antiBlunderFailed
            meta.move_safe = antiBlunderFailed.length === 0
        }
    }

    const anti_blunder_checks = ['S1', 'S2', 'S3', 'S4']

    return {
        mode: critical ? 'critical' : 'fast',
        pause_seconds: suggestPauseSeconds(timeControl, elo),
        triggers,
        thinking_plan: critical ? [...THINKING_PLAN_CRITICAL] : [...THINKING_PLAN_FAST],
        mapped_07_reasons: mapTriggersTo07(triggers.map((t) => t.code)),
        anti_blunder_checks,
        anti_blunder_failed: antiBlunderFailed,
        notable_reasons: notable,
        meta,
    }
}

/** Normaliza JSON del worker (legacy keys). */
export function normalizeMentalAssessment(raw) {
    if (!raw || typeof raw !== 'object') return null
    const thinking_plan = (raw.thinking_plan || []).map((step) => ({
        node_id: step.node_id ?? step.node ?? '',
        prompt_es: step.prompt_es ?? step.prompt ?? '',
        phase: step.phase ?? '',
    }))
    const triggers = (raw.triggers || []).map((t) => ({
        code: typeof t.code === 'string' ? t.code : t.code?.value ?? '',
        label_es: t.label_es ?? t.label ?? '',
        evidence: t.evidence ?? [],
    }))
    return {
        mode: raw.mode?.value ?? raw.mode ?? 'fast',
        pause_seconds: raw.pause_seconds ?? 10,
        triggers,
        thinking_plan,
        mapped_07_reasons: raw.mapped_07_reasons ?? [],
        meta: raw.meta ?? {},
    }
}
