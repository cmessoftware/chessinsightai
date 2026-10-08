import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import {
    classificationPendingUserMessage,
    engineLabelDisplayName,
    formatClassificationProgressLabel,
} from '../../utils/coachEngineLabels.js'
import { formatPlayerEval } from '../../utils/engineEval.js'
import { lookupClassification } from '../../utils/coachPgnDisplay.js'
import { formatCpPawnsShort } from '../../utils/coachPedagogicalImpact.js'
import { pathKeyFromPath } from '../../utils/coachPlyClassification.js'
import { lookupRecommendationTemplate } from '../../utils/coachRecommendations.js'

function Block({ title, children }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {title}
            </Typography>
            {children}
        </Box>
    )
}

/**
 * CA-4 — Análisis avanzado por ply seleccionado (spec §7).
 */
export default function AdvancedMoveAnalysisPanel({
    cursorPath = [],
    cursorSan = null,
    classificationByPathKey = null,
    classificationProgress = null,
    moverElo = null,
}) {
    const atStart = !cursorPath?.length
    const pathKey = pathKeyFromPath(cursorPath)
    const row = lookupClassification(classificationByPathKey, cursorPath)

    if (atStart) {
        return (
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    Elegí una jugada en el PGN para ver el análisis avanzado de ese ply.
                </Typography>
            </Paper>
        )
    }

    if (!row || row.engineLabel === 'pending') {
        const globalLine = formatClassificationProgressLabel(classificationProgress)
        const pending = classificationPendingUserMessage(row)
        const stillQueued =
            classificationProgress?.status === 'running' &&
            row == null &&
            classificationProgress.total > 0

        return (
            <Paper variant="outlined" sx={{ p: 2 }}>
                {globalLine && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        {globalLine}
                    </Typography>
                )}
                <Typography variant="body2" gutterBottom>
                    {cursorSan ? `${cursorSan}` : `Ply ${cursorPath.length}`}
                </Typography>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                    {stillQueued ? 'En cola del análisis en background…' : pending.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {stillQueued
                        ? 'El WASM recorre la línea principal en orden; esta jugada se clasificará cuando llegue su turno.'
                        : pending.detail}
                </Typography>
                {row?.bestPvSan?.length > 0 && (
                    <Typography
                        variant="body2"
                        sx={{
                            mt: 1,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        }}
                    >
                        Mejor: {row.bestPvSan.join(' ')}
                    </Typography>
                )}
            </Paper>
        )
    }

    const playedEval = formatPlayerEval(row.playedScore)
    const bestEval = formatPlayerEval(row.bestScore)
    const labelName = engineLabelDisplayName(row.engineLabel)
    const cpLossText =
        row.cpLoss != null ? `${row.cpLoss} cp (${formatCpPawnsShort(row.cpLoss)} peones)` : '—'

    const bestSan =
        row.bestPvSan?.[0] ||
        (row.bestMoveUci && row.bestMoveUci.length >= 4
            ? `${row.bestMoveUci.slice(0, 2)}-${row.bestMoveUci.slice(2, 4)}`
            : null)
    const pvLine = row.bestPvSan?.length ? row.bestPvSan.join(' ') : null

    const recommendation = lookupRecommendationTemplate({
        engineLabel: row.engineLabel,
        playerElo: moverElo,
    })

    const lessonLines = []
    if (row.pedagogicalImpactMessage) lessonLines.push(row.pedagogicalImpactMessage)
    if (recommendation.text) {
        lessonLines.push(
            recommendation.mode === 'basic'
                ? recommendation.text
                : `Recomendación (Elo ${recommendation.bandLabel}): ${recommendation.text}`,
        )
    }
    if (row.thresholdHint) lessonLines.push(row.thresholdHint)
    if (row.engineLabel === 'good' && !lessonLines.length) {
        lessonLines.push('Buena jugada respecto a la mejor línea del motor en esta profundidad.')
    }

    const globalLine = formatClassificationProgressLabel(classificationProgress)

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            {globalLine && classificationProgress?.status === 'running' && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    {globalLine}
                </Typography>
            )}
            <Typography variant="subtitle1" gutterBottom sx={{ fontFamily: 'inherit' }}>
                {cursorSan || row.san || pathKey}
                {labelName && row.engineLabel !== 'good' ? (
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        · {labelName}
                    </Typography>
                ) : null}
            </Typography>

            <Block title="1. Qué cambió con la jugada">
                <Typography variant="body2" component="div">
                    Eval tras tu jugada: <strong>{playedEval}</strong>
                    {bestEval !== '—' ? (
                        <>
                            {' '}
                            · Mejor candidata: <strong>{bestEval}</strong>
                        </>
                    ) : null}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Pérdida vs mejor: {cpLossText}
                </Typography>
            </Block>

            <Block title="2. Alternativa a considerar">
                {bestSan ? (
                    <Typography variant="body2">
                        Mejor jugada: <strong>{bestSan}</strong>
                    </Typography>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Sin candidata principal del motor.
                    </Typography>
                )}
            </Block>

            <Block title="3. Variante">
                {pvLine ? (
                    <Typography
                        variant="body2"
                        sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
                    >
                        {pvLine}
                    </Typography>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Variante no disponible.
                    </Typography>
                )}
            </Block>

            <Block title="4. Lección práctica">
                {lessonLines.map((line, i) => (
                    <Typography key={i} variant="body2" sx={{ mt: i ? 0.75 : 0 }}>
                        {line}
                    </Typography>
                ))}
            </Block>

            <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 1 }}>
                Motor local (WASM) · etiqueta por cp_loss §1; impacto por umbrales Elo v1.
            </Typography>
        </Paper>
    )
}
