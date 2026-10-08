import { Chess } from 'chess.js'

export const ROOT_ID = 'root'

export function createEmptyRoot(fen) {
    return {
        id: ROOT_ID,
        san: null,
        uci: null,
        fen: fen || new Chess().fen(),
        fromGame: true,
        children: [],
    }
}

/** Build tree from main-line replay arrays (children[0] chain = partida importada). */
export function buildTreeFromMainLine(fens, ucis, moves) {
    const root = createEmptyRoot(fens[0])
    let node = root
    for (let i = 0; i < moves.length; i += 1) {
        const child = {
            id: `g-${i + 1}`,
            san: moves[i].san,
            uci: ucis[i],
            fen: fens[i + 1],
            fromGame: true,
            children: [],
        }
        node.children.push(child)
        node = child
    }
    return root
}

export function cloneTree(root) {
    return JSON.parse(JSON.stringify(root))
}

export function getNodeAtPath(root, path) {
    let node = root
    for (let i = 0; i < path.length; i += 1) {
        const idx = path[i]
        if (!node.children?.[idx]) return node
        node = node.children[idx]
    }
    return node
}

export function pathsEqual(a, b) {
    if (a.length !== b.length) return false
    return a.every((v, i) => v === b[i])
}

/** Path following only main line (index 0) for `ply` plies. */
export function mainLinePathForPly(ply) {
    return Array(Math.max(0, ply)).fill(0)
}

export function isMainLinePath(path) {
    return path.every((idx) => idx === 0)
}

/** Moves along children[0] for the classic PGN table (linea principal). */
export function mainLineMovesFromTree(root) {
    const moves = []
    let node = root
    let ply = 0
    while (node.children?.length > 0) {
        const child = node.children[0]
        ply += 1
        const stm = node.fen.split(/\s+/)[1] || 'w'
        moves.push({
            ply,
            san: child.san,
            color: stm,
            moveNumber: Math.floor((ply - 1) / 2) + 1,
        })
        node = child
    }
    return moves
}

export function mainLineEndPath(root) {
    const path = []
    let node = root
    while (node.children?.length > 0) {
        path.push(0)
        node = node.children[0]
    }
    return path
}

export function pathToBranchEnd(root, path) {
    const p = [...path]
    let node = getNodeAtPath(root, p)
    while (node.children?.length > 0) {
        p.push(0)
        node = node.children[0]
    }
    return p
}

export function pathStepBack(path) {
    return path.length > 0 ? path.slice(0, -1) : path
}

export function pathStepForward(root, path) {
    const node = getNodeAtPath(root, path)
    if (!node.children?.length) return path
    return [...path, 0]
}

export function countMainLinePlies(root) {
    return mainLineEndPath(root).length
}

/** Número de ramificaciones (índice > 0) en el path = profundidad de variante. */
export function variationNestDepth(path) {
    if (!path?.length) return 0
    return path.filter((idx) => idx > 0).length
}

export const MAX_VARIATION_NEST_DEPTH = 2

export function canAddVariationSibling(path) {
    return variationNestDepth(path) < MAX_VARIATION_NEST_DEPTH
}

function subtreeContainsFromGame(node) {
    if (!node?.children?.length) return false
    for (const child of node.children) {
        if (child.fromGame) return true
        if (subtreeContainsFromGame(child)) return true
    }
    return false
}

/** Si truncar en `path` elimina jugadas importadas del PGN. */
export function truncateTouchesImportedMoves(root, path) {
    const node = getNodeAtPath(root, path)
    return subtreeContainsFromGame(node)
}

/** Quita todas las jugadas posteriores a la posición `path` (vacía `node.children`). */
export function truncateLineForward(root, path) {
    if (path == null || path.length === 0) return null
    const tree = cloneTree(root)
    const node = getNodeAtPath(tree, path)
    if (!node) return null
    node.children = []
    return { tree, path: [...path] }
}

/**
 * Play move from current path; reuses existing child or adds user variation.
 * Returns { tree, path, lastUci } or null if illegal.
 */
export function applyMoveAtPath(root, path, { from, to, promotion = 'q' }) {
    const tree = cloneTree(root)
    const node = getNodeAtPath(tree, path)
    const chess = new Chess(node.fen)
    let played
    try {
        played = chess.move({ from, to, promotion })
    } catch {
        return null
    }
    if (!played) return null
    const uci = played.from + played.to + (played.promotion || '')
    let childIndex = node.children.findIndex((c) => c.uci === uci)
    if (childIndex < 0) {
        const willBeSibling = node.children.length > 0
        if (willBeSibling && !canAddVariationSibling(path)) {
            return null
        }
        node.children.push({
            id: `u-${crypto.randomUUID()}`,
            san: played.san,
            uci,
            fen: chess.fen(),
            fromGame: false,
            children: [],
        })
        childIndex = node.children.length - 1
    }
    return {
        tree,
        path: [...path, childIndex],
        lastUci: uci,
    }
}

/** Remove user variation node at path (must not be fromGame). Returns new tree + path to parent. */
export function deleteVariationAtPath(root, path) {
    if (path.length === 0) return null
    const tree = cloneTree(root)
    const parentPath = path.slice(0, -1)
    const index = path[path.length - 1]
    const parent = getNodeAtPath(tree, parentPath)
    const target = parent.children?.[index]
    if (!target || target.fromGame) return null
    parent.children.splice(index, 1)
    return { tree, path: parentPath }
}

export function nodeAtPathFromGame(root, path) {
    const node = getNodeAtPath(root, path)
    return node
}

export function lastUciForPath(root, path) {
    if (!path.length) return null
    const node = getNodeAtPath(root, path)
    return node.uci || null
}
