import { ENGINE_LABEL_SYMBOLS, engineLabelDisplayName } from './coachEngineLabels.js'
import { pathKeyFromPath } from './coachPlyClassification.js'
import { pathsEqual } from './coachVariationTree.js'

/** @typedef {import('./coachEngineLabels.js').EngineLabel} EngineLabel */

/** Misma tipografía que las jugadas del listado PGN (SAN + PV en tooltips). */
export const PGN_MOVE_FONT_FAMILY = 'ui-monospace, SFMono-Regular, Menlo, monospace'

/** `body2` + mono — listado, tooltips, menú contextual (evita 16px por defecto del `<button>` / Tooltip). */
export function pgnMoveTextSx(theme) {
    const body2 = theme.typography.body2
    return {
        fontFamily: PGN_MOVE_FONT_FAMILY,
        fontSize: body2.fontSize,
        fontWeight: body2.fontWeight,
        lineHeight: 1.85,
        letterSpacing: body2.letterSpacing,
    }
}

/** Leyenda CA-3 (solo errores; buena jugada = sin marca). */
export const PGN_CLASSIFICATION_LEGEND = Object.freeze([
    { label: 'inaccuracy', text: 'Imprecisión', symbol: '?!' },
    { label: 'mistake', text: 'Error', symbol: '?' },
    { label: 'blunder', text: 'Error grave', symbol: '??' },
])

const ERROR_LABELS = new Set(['inaccuracy', 'mistake', 'blunder'])

export function isErrorEngineLabel(engineLabel) {
    return ERROR_LABELS.has(engineLabel)
}

export function lookupClassification(classificationByPathKey, path) {
    if (!classificationByPathKey || !path?.length) return null
    return classificationByPathKey[pathKeyFromPath(path)] ?? null
}

export function isPlayerHalfMove(halfColor, playerColor) {
    const p = (playerColor || 'white').toLowerCase() === 'black' ? 'b' : 'w'
    return halfColor === p
}

/** Sufijo NAG tras SAN (solo errores). */
export function nagSuffixForClassification(classification) {
    if (!classification?.engineLabel || !isErrorEngineLabel(classification.engineLabel)) return ''
    return ENGINE_LABEL_SYMBOLS[classification.engineLabel] || ''
}

/** Tooltip del badge: descripción + impacto pedagógico v1 + PV sugerida. */
export function buildLabelTooltip(classification) {
    if (!classification?.engineLabel || !isErrorEngineLabel(classification.engineLabel)) return ''
    const lines = [engineLabelDisplayName(classification.engineLabel)]
    if (classification.pedagogicalImpactMessage) {
        lines.push(classification.pedagogicalImpactMessage)
    }
    if (classification.thresholdHint) {
        lines.push(classification.thresholdHint)
    }
    const pv =
        classification.bestPvSan?.length > 0
            ? classification.bestPvSan.join(' ')
            : classification.bestMoveUci
              ? classification.bestMoveUci
              : null
    if (pv) lines.push(`Mejor: ${pv}`)
    return lines.join('\n')
}

/** MUI `sx` chip background/text by engine label. */
export function labelChipColors(engineLabel) {
    switch (engineLabel) {
        case 'good':
            return { bgcolor: 'success.50', color: 'success.dark', borderColor: 'success.light' }
        case 'inaccuracy':
            return { bgcolor: 'grey.100', color: 'text.secondary', borderColor: 'grey.300' }
        case 'mistake':
            return { bgcolor: 'warning.50', color: 'warning.dark', borderColor: 'warning.light' }
        case 'blunder':
            return { bgcolor: 'error.50', color: 'error.dark', borderColor: 'error.light' }
        default:
            return { bgcolor: 'action.hover', color: 'text.disabled', borderColor: 'divider' }
    }
}

export function labelChipAbbrev(engineLabel) {
    switch (engineLabel) {
        case 'inaccuracy':
            return '?!'
        case 'mistake':
            return '?'
        case 'blunder':
            return '??'
        default:
            return ''
    }
}

/** All position FENs in tree (for eval prefetch). */
export function collectFensFromTree(root) {
    const seen = new Set()
    const list = []
    const add = (fen) => {
        if (!fen || seen.has(fen)) return
        seen.add(fen)
        list.push(fen)
    }
    add(root.fen)
    const walk = (node) => {
        for (const child of node.children || []) {
            add(child.fen)
            walk(child)
        }
    }
    walk(root)
    return list
}

function halfMoveFromChild(parentNode, parentPath, child, childIndex) {
    const stm = parentNode.fen.split(/\s+/)[1] || 'w'
    return {
        san: child.san,
        path: [...parentPath, childIndex],
        fen: child.fen,
        fromGame: child.fromGame,
        color: stm,
        ply: parentPath.length + 1,
    }
}

const MAX_VARIATION_DISPLAY_DEPTH = 2

function buildSiblingBranches(node, nodePath, currentDepth, maxDepth) {
    if (currentDepth >= maxDepth || !node?.children?.length) return []
    const branches = []
    for (let i = 1; i < node.children.length; i += 1) {
        branches.push(buildVariationBranch(node, nodePath, i, currentDepth + 1, maxDepth))
    }
    return branches
}

/** Rama de variante con subvariantes anidadas (hasta `maxDepth` niveles). */
export function buildVariationBranch(parentNode, parentPath, startIndex, currentDepth, maxDepth) {
    let node = parentNode.children[startIndex]
    let path = [...parentPath, startIndex]
    const steps = []

    steps.push({
        half: halfMoveFromChild(parentNode, parentPath, node, startIndex),
        nested: buildSiblingBranches(node, path, currentDepth, maxDepth),
    })

    while (node.children?.length > 0) {
        const posNode = node
        const posPath = path
        node = node.children[0]
        path = [...path, 0]
        steps.push({
            half: halfMoveFromChild(posNode, posPath, node, 0),
            nested: buildSiblingBranches(node, path, currentDepth, maxDepth),
        })
    }

    return { headPath: [...parentPath, startIndex], steps }
}

/** Variantes directas (children[1..]) desde un nodo de la línea principal o variante. */
export function buildVariationBranches(parentNode, parentPath, maxDepth = MAX_VARIATION_DISPLAY_DEPTH) {
    const branches = []
    for (let i = 1; i < (parentNode.children?.length || 0); i += 1) {
        branches.push(buildVariationBranch(parentNode, parentPath, i, 1, maxDepth))
    }
    return branches
}

/** @deprecated use buildVariationBranches; conserva `chain` plano para tests. */
function variationBranches(parentNode, parentPath) {
    return buildVariationBranches(parentNode, parentPath).map((branch) => ({
        headPath: branch.headPath,
        chain: branch.steps.map((s) => s.half),
        steps: branch.steps,
    }))
}

/** Etiquetas PGN dentro de paréntesis: 1... c5 2. Nf3 */
export function tokenizeVariationChain(chain, startMoveNum) {
    if (!chain?.length) return []
    let n = startMoveNum
    const tokens = []
    for (let i = 0; i < chain.length; i += 1) {
        const half = chain[i]
        const next = chain[i + 1]
        if (half.color === 'w') {
            tokens.push({ prefix: `${n}.`, half })
            if (!next || next.color !== 'b') {
                n += 1
            }
        } else {
            tokens.push({ prefix: `${n}...`, half })
            n += 1
        }
    }
    return tokens
}

/**
 * Filas para el panel: línea principal en pares + variantes indentadas tras cada jugada.
 */
export function buildPgnDisplayRows(root) {
    if (!root) return [{ type: 'start', path: [], fen: '' }]
    const rows = [{ type: 'start', path: [], fen: root.fen }]

    let node = root
    let path = []
    let moveNum = 1
    let pendingWhite = null
    let pendingVariations = []

    const flushPair = () => {
        if (!pendingWhite && pendingVariations.length === 0) return
        rows.push({
            type: 'pair',
            moveNum,
            white: pendingWhite,
            black: null,
            afterWhiteVariations: pendingVariations,
            afterBlackVariations: [],
        })
        pendingWhite = null
        pendingVariations = []
        moveNum += 1
    }

    while (node.children?.length > 0) {
        const parentNode = node
        const parentPath = path
        const branches = variationBranches(parentNode, parentPath)

        const child = node.children[0]
        path = [...path, 0]
        const half = halfMoveFromChild(parentNode, parentPath, child, 0)

        if (half.color === 'w') {
            if (pendingWhite) {
                rows.push({
                    type: 'pair',
                    moveNum,
                    white: pendingWhite,
                    black: null,
                    afterWhiteVariations: pendingVariations,
                    afterBlackVariations: [],
                })
                moveNum += 1
                pendingVariations = []
            }
            pendingWhite = half
            if (branches.length) pendingVariations = branches
        } else {
            rows.push({
                type: 'pair',
                moveNum,
                white: pendingWhite,
                black: half,
                afterWhiteVariations: pendingVariations,
                afterBlackVariations: branches,
            })
            pendingWhite = null
            pendingVariations = []
            moveNum += 1
        }
        node = child
    }

    if (pendingWhite) {
        rows.push({
            type: 'pair',
            moveNum,
            white: pendingWhite,
            black: null,
            afterWhiteVariations: pendingVariations,
            afterBlackVariations: [],
        })
    }

    return rows
}

export function isPathSelected(cursorPath, path) {
    return pathsEqual(cursorPath, path)
}
