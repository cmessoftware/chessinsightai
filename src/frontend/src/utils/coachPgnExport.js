import { mainLineMovesFromTree, moveNumberFromPlyCount } from './coachVariationTree.js'

/** Tag-pair lines before movetext (Event, White, FEN, SetUp, …). */
export function extractPgnHeadersBlock(pgnText) {
    const lines = []
    for (const raw of String(pgnText || '').split(/\r?\n/)) {
        const trimmed = raw.trim()
        if (/^\[[A-Za-z][A-Za-z0-9]*\s+"[^"]*"\]\s*$/.test(trimmed)) {
            lines.push(trimmed)
            continue
        }
        if (!trimmed && lines.length) break
        if (lines.length) break
        if (trimmed) break
    }
    return lines.join('\n')
}

/** Full PGN snippet for clipboard: headers + blank line + movetext. */
export function buildPgnClipboardText(movetext, sourcePgn) {
    const body = String(movetext ?? '').trim()
    const headers = extractPgnHeadersBlock(sourcePgn)
    if (!headers) return body
    if (!body) return headers
    return `${headers}\n\n${body}`
}

function sideToMove(fen) {
    return (fen.split(/\s+/)[1] || 'w').toLowerCase()
}

function appendResult(text, result) {
    const trimmedResult = typeof result === 'string' ? result.trim() : ''
    if (!trimmedResult || trimmedResult === '*') return text
    return `${text} ${trimmedResult}`
}

/** White move or black starting a variation segment (`1... c5`). */
function formatMoveToken(fen, san, plyBefore) {
    const stm = sideToMove(fen)
    const moveNum = moveNumberFromPlyCount(plyBefore + 1)
    if (stm === 'w') return `${moveNum}. ${san}`
    return `${moveNum}... ${san}`
}

function serializeFromChild(parent, childIndex, plyBefore) {
    const child = parent?.children?.[childIndex]
    if (!child) return ''

    const chunks = []
    let cur = child
    let ply = plyBefore + 1
    chunks.push(formatMoveToken(parent.fen, cur.san, plyBefore))

    while (cur.children?.length > 0) {
        for (let i = 1; i < cur.children.length; i += 1) {
            const nested = serializeFromChild(cur, i, ply)
            if (nested) chunks.push(`(${nested})`)
        }
        const next = cur.children[0]
        if (sideToMove(cur.fen) === 'w') {
            chunks.push(formatMoveToken(cur.fen, next.san, ply))
        } else {
            chunks.push(next.san)
        }
        cur = next
        ply += 1
    }

    return chunks.join(' ')
}

/** Movetext with nested `( )` variations (all branches in the tree). */
export function formatTreePgnMovetext(root, { result = null } = {}) {
    if (!root?.children?.length) return ''
    return appendResult(serializeFromChild(root, 0, 0), result)
}

/** Standard movetext for the main line (children[0] only), e.g. `1. e4 e5 2. Nf3`. */
export function formatMainLinePgnMovetext(root, { result = null } = {}) {
    if (!root) return ''
    const moves = mainLineMovesFromTree(root)
    if (!moves.length) return ''

    const parts = []
    for (const m of moves) {
        if (m.color === 'w') {
            parts.push(`${m.moveNumber}. ${m.san}`)
        } else {
            parts.push(m.san)
        }
    }

    return appendResult(parts.join(' '), result)
}

export async function copyTextToClipboard(text) {
    const value = String(text ?? '')
    if (!value) return false
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        return true
    }
    if (typeof document === 'undefined') return false
    const ta = document.createElement('textarea')
    ta.value = value
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
        ok = document.execCommand('copy')
    } finally {
        document.body.removeChild(ta)
    }
    return ok
}
