import { Chess } from 'chess.js'
import { fullmoveNumberAtPly, sideToMoveAtPly } from './pgnMoveNumber.js'

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
/** Path on imported main line (child index 0) with `plyCount` plies from root. */
export function mainLinePathForPlyCount(plyCount) {
    const n = Math.max(0, Math.floor(Number(plyCount) || 0))
    return Array.from({ length: n }, () => 0)
}

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

/** Número de movimiento PGN (1…N) a partir de plies jugados desde la posición inicial. */
export function moveNumberFromPlyCount(plyCount) {
    if (!plyCount) return 0
    return Math.floor((plyCount - 1) / 2) + 1
}

export function isMainLinePath(path) {
    return path.every((idx) => idx === 0)
}

/** Path to the first move of the variation branch containing `path`. */
export function variationBranchHeadPath(path) {
    if (!path?.length) return []
    const headLen = path.findIndex((idx) => idx > 0)
    if (headLen < 0) return []
    return path.slice(0, headLen + 1)
}

export function isVariationPath(path) {
    return Boolean(path?.some((idx) => idx > 0))
}

/** Moves along children[0] for the classic PGN table (linea principal). */
export function mainLineMovesFromTree(root) {
    const moves = []
    let node = root
    let ply = 0
    const rootFen = root.fen
    /** @type {number[]} */
    let path = []
    while (node.children?.length > 0) {
        const child = node.children[0]
        path = [...path, 0]
        const plyBefore = ply
        ply += 1
        const stm = sideToMoveAtPly(rootFen, plyBefore)
        moves.push({
            ply,
            san: child.san,
            color: stm,
            moveNumber: fullmoveNumberAtPly(rootFen, plyBefore),
            path: [...path],
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

/** Quita la jugada hoja en `path` (línea principal o variante, sin continuación). */
export function deleteLeafMoveAtPath(root, path) {
    if (!path?.length) return null
    const tree = cloneTree(root)
    const parentPath = path.slice(0, -1)
    const index = path[path.length - 1]
    const parent = getNodeAtPath(tree, parentPath)
    const target = parent?.children?.[index]
    if (!target) return null
    if (target.children?.length) return null
    parent.children.splice(index, 1)
    const nextPath = parentPath.length === 0 ? [] : [...parentPath]
    return { tree, path: nextPath }
}

/**
 * Mueve la línea de `path` a la variante principal.
 * En cada desvío, esa jugada pasa a `children[0]` y la línea anterior queda como variante.
 */
export function promotePathToMainLine(root, path) {
    if (!path?.length || !isVariationPath(path)) return null
    const tree = cloneTree(root)
    let node = tree
    const newPath = []
    for (const index of path) {
        const child = node.children?.[index]
        if (!child) return null
        if (index > 0) {
            const [moved] = node.children.splice(index, 1)
            node.children.unshift(moved)
        }
        newPath.push(0)
        node = node.children[0]
    }
    return { tree, path: newPath }
}

/**
 * Inverso de promote: la jugada de la línea principal (y lo que sigue) pasa al final
 * de las alternativas. La primera variante de esa posición queda como línea principal.
 */
export function demoteMainLineAtPath(root, path) {
    if (!path?.length || !isMainLinePath(path)) return null
    const tree = cloneTree(root)
    const parentPath = path.slice(0, -1)
    const parent = getNodeAtPath(tree, parentPath)
    if (!parent?.children || parent.children.length < 2) return null
    const [main] = parent.children.splice(0, 1)
    parent.children.push(main)
    return { tree, path: [...parentPath, parent.children.length - 1] }
}

/**
 * Play move from current path; reuses existing child or adds user variation.
 * Returns { tree, path, lastUci } or null if illegal.
 */
export function applyMoveAtPath(root, path, { from, to, promotion } = {}) {
    const tree = cloneTree(root)
    const node = getNodeAtPath(tree, path)
    const chess = new Chess(node.fen)
    let played
    try {
        played =
            promotion != null && promotion !== ''
                ? chess.move({ from, to, promotion })
                : chess.move({ from, to })
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
