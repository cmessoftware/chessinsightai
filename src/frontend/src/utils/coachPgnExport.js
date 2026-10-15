import { mainLineMovesFromTree } from './coachVariationTree.js'

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

    let text = parts.join(' ')
    const trimmedResult = typeof result === 'string' ? result.trim() : ''
    if (trimmedResult && trimmedResult !== '*') {
        text = `${text} ${trimmedResult}`
    }
    return text
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
