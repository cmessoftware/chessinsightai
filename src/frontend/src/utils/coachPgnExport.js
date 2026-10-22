import { mainLineMovesFromTree } from './coachVariationTree.js'
import {
    extractPgnHeadersBlock,
    trailingResultFromMovetext,
    upsertPgnHeaderBlock,
} from './pgnHeaders.js'
import { fullmoveNumberAtPly, sideToMoveAtPly } from './pgnMoveNumber.js'

export { extractPgnHeadersBlock } from './pgnHeaders.js'

/** Full PGN snippet for clipboard: headers + blank line + movetext (Result synced to body). */
export function buildPgnClipboardText(movetext, sourcePgn) {
    const body = String(movetext ?? '').trim()
    let headers = extractPgnHeadersBlock(sourcePgn)
    const bodyResult = trailingResultFromMovetext(body)
    if (headers && bodyResult) {
        headers = upsertPgnHeaderBlock(headers, 'Result', bodyResult)
    }
    if (!headers) return body
    if (!body) return headers
    return `${headers}\n\n${body}`
}

function appendResult(text, result) {
    const trimmedResult = typeof result === 'string' ? result.trim() : ''
    if (!trimmedResult || trimmedResult === '*') return text
    return `${text} ${trimmedResult}`
}

/** White move or black starting a variation segment (`1... c5`). */
function formatMoveToken(rootFen, plyBefore, san, { variationStart = false } = {}) {
    const stm = sideToMoveAtPly(rootFen, plyBefore)
    const moveNum = fullmoveNumberAtPly(rootFen, plyBefore)
    if (stm === 'w') return `${moveNum}. ${san}`
    if (
        variationStart ||
        plyBefore === 0 ||
        sideToMoveAtPly(rootFen, plyBefore - 1) !== 'w'
    ) {
        return `${moveNum}... ${san}`
    }
    return san
}

function serializeFromChild(rootFen, parent, childIndex, plyBefore) {
    const child = parent?.children?.[childIndex]
    if (!child) return ''

    const chunks = []
    let cur = child
    let ply = plyBefore + 1
    chunks.push(
        formatMoveToken(rootFen, plyBefore, cur.san, {
            variationStart: childIndex !== 0,
        }),
    )

    while (cur.children?.length > 0) {
        for (let i = 1; i < cur.children.length; i += 1) {
            const nested = serializeFromChild(rootFen, cur, i, ply)
            if (nested) chunks.push(`(${nested})`)
        }
        const next = cur.children[0]
        chunks.push(formatMoveToken(rootFen, ply, next.san))
        cur = next
        ply += 1
    }

    return chunks.join(' ')
}

/** Movetext with nested `( )` variations (all branches in the tree). */
export function formatTreePgnMovetext(root, { result = null } = {}) {
    if (!root?.children?.length) return ''
    return appendResult(serializeFromChild(root.fen, root, 0, 0), result)
}

/** Standard movetext for the main line (children[0] only), e.g. `1. e4 e5 2. Nf3`. */
export function formatMainLinePgnMovetext(root, { result = null } = {}) {
    if (!root) return ''
    const moves = mainLineMovesFromTree(root)
    if (!moves.length) return ''

    const parts = []
    const rootFen = root.fen
    for (const m of moves) {
        const plyBefore = m.ply - 1
        const stm = sideToMoveAtPly(rootFen, plyBefore)
        if (stm === 'w') {
            parts.push(`${m.moveNumber}. ${m.san}`)
        } else if (
            plyBefore === 0 ||
            sideToMoveAtPly(rootFen, plyBefore - 1) !== 'w'
        ) {
            parts.push(`${m.moveNumber}... ${m.san}`)
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
