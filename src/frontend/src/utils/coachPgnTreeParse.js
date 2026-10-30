import { Chess } from 'chess.js'
import { PLY_USER_NAG_OPTIONS } from './coachPlyUserAnnotations.js'
import {
    buildPgnClipboardText,
    formatTreePgnMovetext,
} from './coachPgnExport.js'
import {
    buildReplayFromPgn,
    extractFirstGamePgnText,
    extractFenHeader,
    ensurePgnSetupHeader,
} from './coachPgnReplay.js'
import { createEmptyRoot } from './coachVariationTree.js'

const NAG_SUFFIXES = PLY_USER_NAG_OPTIONS.map((o) => o.value)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

/** Movetext only (no tag pairs). Strips `$N` NAGs. Comments stay unless `keepComments` is false. */
export function extractMovetextFromPgn(pgnText, { keepComments = false } = {}) {
    const lines = String(pgnText || '').split(/\r?\n/)
    const body = []
    let inHeaders = true
    for (const raw of lines) {
        const trimmed = raw.trim()
        if (inHeaders) {
            if (!trimmed) {
                if (body.length) inHeaders = false
                continue
            }
            if (trimmed.startsWith('[')) continue
            inHeaders = false
        }
        body.push(raw)
    }
    let text = body.join(' ').trim()
    if (!keepComments) {
        text = text.replace(/\{[^}]*\}/g, ' ')
    }
    text = text.replace(/\$\d+/g, ' ')
    text = text.replace(/\s(1-0|0-1|1\/2-1\/2|\*)\s*$/i, '')
    return text.replace(/\s+/g, ' ').trim()
}

/** Drop Lichess engine glyphs; keep prose annotations. */
export function readablePgnComment(raw) {
    const text = String(raw || '')
        .replace(/\[%[^\]]*\]/g, ' ')
        .replace(/\[#\]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    return text
}

function splitSanAndNag(token) {
    let san = String(token || '').trim()
    if (!san) return { san: '', nag: '' }
    for (const nag of NAG_SUFFIXES) {
        if (san.endsWith(nag)) {
            return { san: san.slice(0, -nag.length), nag }
        }
    }
    return { san, nag: '' }
}

function tokenizeMovetext(movetext) {
    const tokens = []
    let i = 0
    const s = String(movetext || '')
    while (i < s.length) {
        const ch = s[i]
        if (/\s/.test(ch)) {
            i += 1
            continue
        }
        if (ch === '{') {
            const end = s.indexOf('}', i + 1)
            const close = end === -1 ? s.length : end
            tokens.push({ type: 'comment', text: s.slice(i + 1, close) })
            i = end === -1 ? s.length : end + 1
            continue
        }
        if (ch === '(' || ch === ')') {
            tokens.push(ch)
            i += 1
            continue
        }
        const blackNum = s.slice(i).match(/^(\d+)\.\.\./)
        if (blackNum) {
            i += blackNum[0].length
            continue
        }
        const whiteNum = s.slice(i).match(/^(\d+)\./)
        if (whiteNum) {
            i += whiteNum[0].length
            continue
        }
        let j = i
        while (j < s.length && !/\s/.test(s[j]) && s[j] !== '(' && s[j] !== ')') j += 1
        if (j > i) tokens.push(s.slice(i, j))
        i = j
    }
    return tokens
}

let nodeSeq = 0
function nextNodeId() {
    nodeSeq += 1
    return `p-${nodeSeq}`
}

/** A RAV replaces the move just played, from the position before that move. */
function variationAnchor(lineParent) {
    return lineParent
}

function pushMove(parent, san, { asMainLine = false } = {}) {
    const board = new Chess(parent.fen)
    let played
    try {
        played = board.move(san)
    } catch {
        return null
    }
    if (!played) return null
    const uci = played.from + played.to + (played.promotion || '')
    const existing = parent.children.find((c) => c.uci === uci)
    if (existing) return existing
    const child = {
        id: nextNodeId(),
        san: played.san,
        uci,
        fen: board.fen(),
        fromGame: false,
        children: [],
    }
    if (asMainLine) {
        parent.children.unshift(child)
    } else {
        parent.children.push(child)
    }
    return child
}

/** @returns {null | { message: string }} */
function parseSequence(tokens, parentNode, { attachAsSibling = false } = {}) {
    let cursor = parentNode
    let sibling = attachAsSibling
    let lineParent = parentNode

    while (tokens.length > 0) {
        const t = tokens[0]
        if (t === ')') return null
        if (t && typeof t === 'object' && t.type === 'comment') {
            tokens.shift()
            const text = readablePgnComment(t.text)
            if (text) {
                const prev = cursor.pgnComment ? `${cursor.pgnComment} ` : ''
                cursor.pgnComment = `${prev}${text}`.trim()
            }
            continue
        }
        if (t === '(') {
            tokens.shift()
            const anchor = variationAnchor(lineParent)
            const err = parseSequence(tokens, anchor, { attachAsSibling: true })
            if (err) return err
            if (tokens[0] !== ')') return { message: 'unclosed_variation' }
            tokens.shift()
            continue
        }

        const { san } = splitSanAndNag(tokens.shift())
        if (!san) return { message: 'empty_move' }

        lineParent = cursor
        const moveParent = sibling ? parentNode : cursor
        const child = pushMove(moveParent, san, { asMainLine: !sibling })
        if (!child) return { message: `illegal_move:${san}` }

        sibling = false
        cursor = child
    }
    return null
}

function markMainLineFromGame(node) {
    for (let i = 0; i < node.children.length; i += 1) {
        const child = node.children[i]
        child.fromGame = i === 0
        markMainLineFromGame(child)
    }
}

/**
 * Build variation tree from full PGN (headers + movetext with RAV).
 * @returns {{ tree: object, error: string | null }}
 */
export function buildTreeFromPgn(pgnText) {
    nodeSeq = 0
    const singleGame = extractFirstGamePgnText(ensurePgnSetupHeader(pgnText || ''))
    const replay = buildReplayFromPgn(singleGame)
    let rootFen = replay.fens?.[0] || new Chess().fen()
    if (replay.error === 'invalid_fen') {
        return { tree: createEmptyRoot(), error: 'invalid_fen' }
    }
    const fenHeader = extractFenHeader(singleGame)
    if (fenHeader) {
        try {
            rootFen = new Chess(fenHeader).fen()
        } catch {
            return { tree: createEmptyRoot(), error: 'invalid_fen' }
        }
    }

    const movetext = extractMovetextFromPgn(singleGame, { keepComments: true })
    const root = createEmptyRoot(rootFen)
    if (!movetext) {
        return { tree: root, error: null }
    }

    const tokens = tokenizeMovetext(movetext)
    const err = parseSequence(tokens, root, { siblingBranch: false })
    if (err) {
        return { tree: createEmptyRoot(rootFen), error: err.message }
    }
    markMainLineFromGame(root)
    return { tree: root, error: null }
}

export function buildStudyPgnFromTree(tree, sourcePgn, { result = null, plyUserByPathKey = null } = {}) {
    const movetext = formatTreePgnMovetext(tree, { result, plyUserByPathKey })
    return buildPgnClipboardText(movetext, sourcePgn)
}

export function normalizeStudyPgnForCompare(pgnText) {
    return String(pgnText || '')
        .replace(/\r\n/g, '\n')
        .replace(/\s+/g, ' ')
        .trim()
}

export function studyPgnMatchesTree(storedPgn, tree, sourcePgn, options = {}) {
    const expected = buildStudyPgnFromTree(tree, sourcePgn, options)
    const a = normalizeStudyPgnForCompare(storedPgn)
    const b = normalizeStudyPgnForCompare(expected)
    if (a === b) return true
    const movetextA = normalizeStudyPgnForCompare(extractMovetextFromPgn(storedPgn || ''))
    const movetextB = normalizeStudyPgnForCompare(formatTreePgnMovetext(tree, options))
    return movetextA === movetextB
}
