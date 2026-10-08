import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, IconButton, Menu, MenuItem, Paper, Tooltip, Typography } from '@mui/material'
import DeleteOutline from '@mui/icons-material/DeleteOutline'
import { formatClassificationProgressLabel } from '../../utils/coachEngineLabels.js'
import {
    buildLabelTooltip,
    buildPgnDisplayRows,
    isErrorEngineLabel,
    isPathSelected,
    labelChipAbbrev,
    labelChipColors,
    lookupClassification,
    PGN_CLASSIFICATION_LEGEND,
    pgnMoveTextSx,
    tokenizeVariationChain,
} from '../../utils/coachPgnDisplay.js'

function PgnLegend() {
    return (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5, lineHeight: 1.8 }}>
            {PGN_CLASSIFICATION_LEGEND.map((item, i) => {
                const colors = labelChipColors(item.label)
                return (
                    <Box
                        component="span"
                        key={item.label}
                        sx={{ mr: i < PGN_CLASSIFICATION_LEGEND.length - 1 ? 1.25 : 0 }}
                    >
                        <Box
                            component="span"
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 22,
                                px: 0.35,
                                py: 0.05,
                                borderRadius: 0.5,
                                border: 1,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                fontFamily: 'inherit',
                                verticalAlign: 'middle',
                                mr: 0.35,
                                ...colors,
                            }}
                        >
                            {item.symbol}
                        </Box>
                        {item.text}
                    </Box>
                )
            })}
        </Typography>
    )
}

function EvalChip({ fen, evalByFen }) {
    const text = fen ? evalByFen?.[fen] : null
    return (
        <Typography
            component="span"
            variant="caption"
            sx={{
                color: 'text.secondary',
                userSelect: 'none',
                fontVariantNumeric: 'tabular-nums',
                minWidth: 44,
                textAlign: 'right',
                display: 'inline-block',
            }}
        >
            {text ?? '·'}
        </Typography>
    )
}

function LabelBadge({ classification }) {
    if (!classification?.engineLabel || !isErrorEngineLabel(classification.engineLabel)) return null
    const label = classification.engineLabel
    const colors = labelChipColors(label)
    const abbrev = labelChipAbbrev(label)
    if (!abbrev) return null
    const tip = buildLabelTooltip(classification)
    return (
        <Tooltip
            title={
                <Typography component="div" sx={(theme) => ({ whiteSpace: 'pre-line', ...pgnMoveTextSx(theme) })}>
                    {tip}
                </Typography>
            }
            slotProps={{
                tooltip: {
                    sx: (theme) => ({
                        ...pgnMoveTextSx(theme),
                        maxWidth: 420,
                    }),
                },
            }}
            enterDelay={400}
        >
            <Box
                component="span"
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 22,
                    px: 0.4,
                    py: 0.05,
                    borderRadius: 0.5,
                    border: 1,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    userSelect: 'none',
                    ...colors,
                }}
            >
                {abbrev}
            </Box>
        </Tooltip>
    )
}

function MoveMetrics({ fen, evalByFen }) {
    return (
        <Box
            component="span"
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                minWidth: 48,
                mx: 0.35,
                verticalAlign: 'baseline',
            }}
        >
            <EvalChip fen={fen} evalByFen={evalByFen} />
        </Box>
    )
}

function InlineMove({ half, selected, onSelectPath, moveRef, italic, onMoveContextMenu, contextMeta }) {
    if (!half?.san) return null
    return (
        <Box
            ref={selected ? moveRef : undefined}
            component="button"
            type="button"
            onClick={() => onSelectPath(half.path)}
            onContextMenu={
                onMoveContextMenu
                    ? (e) => onMoveContextMenu(e, half, contextMeta)
                    : undefined
            }
            aria-current={selected ? 'true' : undefined}
            aria-label={half.san}
            sx={(theme) => ({
                ...pgnMoveTextSx(theme),
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                px: 0.25,
                py: 0.1,
                borderRadius: 0.5,
                fontStyle: italic ? 'italic' : 'normal',
                color: italic ? 'secondary.main' : 'text.primary',
                bgcolor: selected ? 'primary.main' : 'transparent',
                ...(selected ? { color: 'primary.contrastText' } : {}),
                '&:hover': {
                    bgcolor: selected ? 'primary.dark' : 'action.hover',
                },
            })}
        >
            {half.san}
        </Box>
    )
}

function moveNumAfterHalf(half, moveNum) {
    if (half.color === 'b') return moveNum + 1
    return moveNum + 1
}

function VariationMoveToken({
    tok,
    cursorPath,
    onSelectPath,
    onDeleteVariation,
    onMoveContextMenu,
    evalByFen,
    activeRef,
    isBranchHead,
}) {
    const selected = isPathSelected(cursorPath, tok.half.path)
    return (
        <>
            <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{ mr: 0.15, userSelect: 'none' }}
            >
                {tok.prefix}
            </Typography>
            <InlineMove
                half={tok.half}
                selected={selected}
                onSelectPath={onSelectPath}
                moveRef={selected ? activeRef : undefined}
                italic={!tok.half.fromGame}
                onMoveContextMenu={onMoveContextMenu}
                contextMeta={{ isBranchHead }}
            />
            <EvalChip fen={tok.half.fen} evalByFen={evalByFen} />
            {!tok.half.fromGame && isBranchHead && onDeleteVariation && (
                <Tooltip title="Quitar variante">
                    <IconButton
                        size="small"
                        aria-label="Quitar variante"
                        onClick={(e) => {
                            e.stopPropagation()
                            onDeleteVariation(tok.half.path)
                        }}
                        sx={{ p: 0.15, verticalAlign: 'middle', ml: 0.1 }}
                    >
                        <DeleteOutline sx={{ fontSize: 13 }} />
                    </IconButton>
                </Tooltip>
            )}
        </>
    )
}

function VariationBranch({
    branch,
    startMoveNum,
    nestLevel,
    cursorPath,
    onSelectPath,
    onDeleteVariation,
    onMoveContextMenu,
    evalByFen,
    activeRef,
    layout = 'inline',
}) {
    const steps = branch.steps || (branch.chain || []).map((half) => ({ half, nested: [] }))
    let moveNum = startMoveNum
    const inline = layout === 'inline'
    return (
        <Box
            component={inline ? 'span' : 'div'}
            sx={{
                display: inline ? 'inline-flex' : 'block',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                gap: '2px 4px',
                maxWidth: inline ? '100%' : '100%',
                width: inline ? 'auto' : '100%',
                minWidth: 0,
                pl: inline ? 0 : 0.75 + nestLevel * 0.5,
                mt: inline ? 0 : 0.25,
                mb: inline ? 0 : 0.15,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                boxSizing: 'border-box',
                verticalAlign: inline ? 'baseline' : undefined,
            }}
        >
            <Box
                component={inline ? 'span' : 'div'}
                sx={{
                    display: 'inline-flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    gap: '2px 4px',
                    maxWidth: '100%',
                    minWidth: 0,
                }}
            >
                <Typography component="span" variant="body2" color="text.secondary" sx={{ mx: 0.15 }}>
                    (
                </Typography>
                {steps.map((step, stepIdx) => {
                    const tokens = tokenizeVariationChain([step.half], moveNum)
                    const tok = tokens[0]
                    const nestedStart = Math.floor((step.half.ply - 1) / 2) + 1
                    moveNum = moveNumAfterHalf(step.half, moveNum)
                    return (
                        <React.Fragment key={step.half.path.join('-')}>
                            <VariationMoveToken
                                tok={tok}
                                cursorPath={cursorPath}
                                onSelectPath={onSelectPath}
                                onDeleteVariation={onDeleteVariation}
                                onMoveContextMenu={onMoveContextMenu}
                                evalByFen={evalByFen}
                                activeRef={activeRef}
                                isBranchHead={stepIdx === 0}
                            />
                            {(step.nested || []).map((sub) => (
                                <VariationBranch
                                    key={sub.headPath.join('-')}
                                    branch={sub}
                                    startMoveNum={nestedStart}
                                    nestLevel={nestLevel + 1}
                                    cursorPath={cursorPath}
                                    onSelectPath={onSelectPath}
                                    onDeleteVariation={onDeleteVariation}
                                    onMoveContextMenu={onMoveContextMenu}
                                    evalByFen={evalByFen}
                                    activeRef={activeRef}
                                    layout={layout}
                                />
                            ))}
                        </React.Fragment>
                    )
                })}
                <Typography component="span" variant="body2" color="text.secondary" sx={{ mx: 0.15 }}>
                    )
                </Typography>
            </Box>
        </Box>
    )
}

function InlineVariations({
    branches,
    startMoveNum,
    cursorPath,
    onSelectPath,
    onDeleteVariation,
    onMoveContextMenu,
    evalByFen,
    activeRef,
    layout = 'inline',
}) {
    if (!branches?.length) return null
    return (
        <>
            {branches.map((branch) => (
                <VariationBranch
                    key={branch.headPath.join('-')}
                    branch={branch}
                    startMoveNum={startMoveNum}
                    nestLevel={0}
                    cursorPath={cursorPath}
                    onSelectPath={onSelectPath}
                    onDeleteVariation={onDeleteVariation}
                    onMoveContextMenu={onMoveContextMenu}
                    evalByFen={evalByFen}
                    activeRef={activeRef}
                    layout={layout}
                />
            ))}
        </>
    )
}

function playerMoveHighlightSx(classification, isPlayerMove) {
    if (!isPlayerMove || !classification?.engineLabel) return {}
    if (classification.engineLabel === 'blunder') {
        return { boxShadow: (t) => `inset 3px 0 0 ${t.palette.error.main}` }
    }
    if (classification.engineLabel === 'mistake') {
        return { boxShadow: (t) => `inset 3px 0 0 ${t.palette.warning.main}` }
    }
    return {}
}

function MoveHalfBlock({
    half,
    selected,
    onSelectPath,
    moveRef,
    evalByFen,
    classificationByPathKey,
    onMoveContextMenu,
}) {
    if (!half) return null
    const classification = lookupClassification(classificationByPathKey, half.path)
    const showError = classification && isErrorEngineLabel(classification.engineLabel)
    return (
        <Box
            component="span"
            sx={{ display: 'inline-flex', alignItems: 'baseline', flexWrap: 'wrap', whiteSpace: 'normal' }}
        >
            <InlineMove
                half={half}
                selected={selected}
                onSelectPath={onSelectPath}
                moveRef={moveRef}
                onMoveContextMenu={onMoveContextMenu}
                contextMeta={{ isBranchHead: false }}
            />
            {showError ? (
                <Box component="span" sx={{ mx: 0.2, verticalAlign: 'middle', lineHeight: 0 }}>
                    <LabelBadge classification={classification} />
                </Box>
            ) : null}
            <MoveMetrics fen={half.fen} evalByFen={evalByFen} />
        </Box>
    )
}

export default function CoachPgnMoveList({
    treeRoot,
    cursorPath = [],
    onSelectPath,
    onDeleteVariation,
    evalByFen = {},
    classificationByPathKey = null,
    playerColor = 'white',
    classificationProgress = null,
    resultLabel = null,
    maxHeight = 520,
    onTruncateForward = null,
    pathHasContinuations = null,
}) {
    const rows = useMemo(() => buildPgnDisplayRows(treeRoot), [treeRoot])
    const activeRef = useRef(null)
    const [moveMenu, setMoveMenu] = useState(null)

    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [cursorPath])

    const handleMoveContextMenu = useCallback(
        (event, half, contextMeta = {}) => {
            if (!half?.path?.length) return
            const isBranchHead = Boolean(contextMeta.isBranchHead)
            const canTruncate =
                pathHasContinuations?.(half.path) && onTruncateForward
            const canDeleteBranch =
                isBranchHead && !half.fromGame && onDeleteVariation
            if (!canTruncate && !canDeleteBranch) return
            event.preventDefault()
            event.stopPropagation()
            setMoveMenu({
                mouseX: event.clientX,
                mouseY: event.clientY,
                half,
                isBranchHead,
            })
        },
        [onTruncateForward, onDeleteVariation, pathHasContinuations],
    )

    const closeMoveMenu = () => setMoveMenu(null)

    const menuCanTruncate =
        moveMenu &&
        moveMenu.half?.path?.length &&
        pathHasContinuations?.(moveMenu.half.path) &&
        onTruncateForward

    const menuCanDeleteBranch =
        moveMenu &&
        moveMenu.isBranchHead &&
        !moveMenu.half?.fromGame &&
        onDeleteVariation

    const atStart = cursorPath.length === 0
    const showLegend = Boolean(classificationByPathKey)

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 280,
                maxHeight,
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                boxSizing: 'border-box',
            }}
        >
            <Box sx={{ px: 1.5, pt: 1.5, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2">PGN</Typography>
                {resultLabel && (
                    <Typography variant="caption" color="text.secondary" display="block">
                        {resultLabel}
                    </Typography>
                )}
                {formatClassificationProgressLabel(classificationProgress) && (
                    <Typography variant="caption" color="text.secondary" display="block">
                        {formatClassificationProgressLabel(classificationProgress)}
                    </Typography>
                )}
                {showLegend && <PgnLegend />}
            </Box>
            <Box
                sx={(theme) => ({
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    flex: 1,
                    minWidth: 0,
                    maxWidth: '100%',
                    ...pgnMoveTextSx(theme),
                    p: 1,
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                })}
            >
                <Box
                    sx={{
                        lineHeight: 1.85,
                        py: 0.35,
                        px: 0.5,
                        borderRadius: 0.5,
                        bgcolor: atStart ? 'action.selected' : 'transparent',
                        mb: 0.5,
                    }}
                >
                    <InlineMove
                        half={{ san: 'Posición inicial', path: [] }}
                        selected={atStart}
                        onSelectPath={onSelectPath}
                        moveRef={atStart ? activeRef : undefined}
                    />
                    <EvalChip fen={treeRoot?.fen} evalByFen={evalByFen} />
                </Box>

                {rows
                    .filter((r) => r.type === 'pair')
                    .map((row) => {
                        const wSel = row.white && isPathSelected(cursorPath, row.white.path)
                        const bSel = row.black && isPathSelected(cursorPath, row.black.path)
                        const afterBlackStart = row.black ? row.moveNum + 1 : row.moveNum
                        const wClass = lookupClassification(classificationByPathKey, row.white?.path)
                        const bClass = lookupClassification(classificationByPathKey, row.black?.path)
                        const rowHighlight =
                            wClass?.engineLabel === 'blunder' || bClass?.engineLabel === 'blunder'
                                ? playerMoveHighlightSx(wClass || bClass, true)
                                : wClass?.engineLabel === 'mistake' || bClass?.engineLabel === 'mistake'
                                  ? playerMoveHighlightSx(wClass || bClass, true)
                                  : {}
                        return (
                            <Box
                                key={`pair-${row.moveNum}-${row.white?.path?.join('-') ?? 'x'}`}
                                sx={{
                                    lineHeight: 1.85,
                                    py: 0.35,
                                    px: 0.5,
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    bgcolor: wSel || bSel ? 'action.hover' : 'transparent',
                                    maxWidth: '100%',
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    ...rowHighlight,
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'baseline',
                                        gap: '2px 4px',
                                        maxWidth: '100%',
                                        minWidth: 0,
                                        whiteSpace: 'normal',
                                        wordBreak: 'break-word',
                                        overflowWrap: 'anywhere',
                                    }}
                                >
                                    <Typography
                                        component="span"
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mr: 0.35, userSelect: 'none' }}
                                    >
                                        {row.moveNum}.
                                    </Typography>
                                    {row.white && (
                                        <MoveHalfBlock
                                            half={row.white}
                                            selected={wSel}
                                            onSelectPath={onSelectPath}
                                            moveRef={wSel ? activeRef : undefined}
                                            evalByFen={evalByFen}
                                            classificationByPathKey={classificationByPathKey}
                                            onMoveContextMenu={handleMoveContextMenu}
                                        />
                                    )}
                                    <InlineVariations
                                        branches={row.afterWhiteVariations}
                                        startMoveNum={row.moveNum}
                                        cursorPath={cursorPath}
                                        onSelectPath={onSelectPath}
                                        onDeleteVariation={onDeleteVariation}
                                        onMoveContextMenu={handleMoveContextMenu}
                                        evalByFen={evalByFen}
                                        activeRef={activeRef}
                                    />
                                    {row.black && (
                                        <MoveHalfBlock
                                            half={row.black}
                                            selected={bSel}
                                            onSelectPath={onSelectPath}
                                            moveRef={bSel ? activeRef : undefined}
                                            evalByFen={evalByFen}
                                            classificationByPathKey={classificationByPathKey}
                                            onMoveContextMenu={handleMoveContextMenu}
                                        />
                                    )}
                                    <InlineVariations
                                        branches={row.afterBlackVariations}
                                        startMoveNum={afterBlackStart}
                                        cursorPath={cursorPath}
                                        onSelectPath={onSelectPath}
                                        onDeleteVariation={onDeleteVariation}
                                        onMoveContextMenu={handleMoveContextMenu}
                                        evalByFen={evalByFen}
                                        activeRef={activeRef}
                                    />
                                </Box>
                            </Box>
                        )
                    })}
            </Box>
            <Menu
                open={moveMenu != null}
                onClose={closeMoveMenu}
                anchorReference="anchorPosition"
                anchorPosition={
                    moveMenu != null
                        ? { top: moveMenu.mouseY, left: moveMenu.mouseX }
                        : undefined
                }
                slotProps={{
                    paper: {
                        sx: (theme) => pgnMoveTextSx(theme),
                    },
                }}
            >
                {menuCanTruncate && (
                    <MenuItem
                        sx={(theme) => pgnMoveTextSx(theme)}
                        onClick={() => {
                            onTruncateForward(moveMenu.half.path)
                            closeMoveMenu()
                        }}
                    >
                        Borrar jugadas desde aquí…
                    </MenuItem>
                )}
                {menuCanDeleteBranch && (
                    <MenuItem
                        sx={(theme) => pgnMoveTextSx(theme)}
                        onClick={() => {
                            onDeleteVariation(moveMenu.half.path)
                            closeMoveMenu()
                        }}
                    >
                        Quitar variante
                    </MenuItem>
                )}
            </Menu>
        </Paper>
    )
}
