import React from 'react'
import { Box, Chip, List, ListItem, ListItemText, Stack, Typography } from '@mui/material'
import { pgnMoveTextSx } from '../../utils/coachPgnDisplay.js'
import { ANTI_BLUNDER_LABELS } from '../../utils/coachMental1600.js'

const MODE_LABEL = {
    fast: 'Rápido (jugada natural)',
    critical: 'Crítico (pausa y cálculo)',
}

/**
 * @param {{ assessment?: object | null, emptyMessage?: string | null, source?: 'client' | 'server' }} props
 */
export default function Mental1600Panel({ assessment, emptyMessage, source = 'client' }) {
    if (emptyMessage) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                {emptyMessage}
            </Typography>
        )
    }
    if (!assessment) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                Seleccioná una jugada en el PGN para ver el plan mental.
            </Typography>
        )
    }

    const modeLabel = MODE_LABEL[assessment.mode] || assessment.mode

    return (
        <Box>
            <Typography variant="subtitle2" gutterBottom>
                Modo: {modeLabel} — pausa sugerida: {assessment.pause_seconds}s
                {source === 'client' ? (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        (análisis local)
                    </Typography>
                ) : null}
            </Typography>

            {assessment.triggers?.length > 0 ? (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Disparadores (fijate en esto)
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
                        {assessment.triggers.map((t) => (
                            <Chip key={t.code} size="small" label={`${t.code}: ${t.label_es || t.label}`} />
                        ))}
                    </Stack>
                    <List dense disablePadding sx={{ mt: 1 }}>
                        {assessment.triggers.flatMap((t) =>
                            (t.evidence || []).map((line, i) => (
                                <ListItem key={`${t.code}-${i}`} disableGutters sx={{ py: 0 }}>
                                    <ListItemText
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        primary={`· ${line}`}
                                    />
                                </ListItem>
                            )),
                        )}
                    </List>
                </Box>
            ) : assessment.mode === 'fast' ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Sin alertas tácticas fuertes: priorizá el plan rápido (C → C1).
                </Typography>
            ) : null}

            {assessment.notable_reasons?.length > 0 ? (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Momento notable
                    </Typography>
                    <List dense disablePadding>
                        {assessment.notable_reasons.map((n) => (
                            <ListItem key={n.kind} disableGutters>
                                <ListItemText primary={`· ${n.evidence}`} primaryTypographyProps={{ variant: 'body2' }} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            ) : null}

            {assessment.anti_blunder_failed?.length > 0 ? (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="error" display="block" gutterBottom>
                        Anti-blunder (jugada hecha)
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
                        {assessment.anti_blunder_failed.map((code) => (
                            <Chip key={code} size="small" color="warning" label={`${code}: ${ANTI_BLUNDER_LABELS[code] || code}`} />
                        ))}
                    </Stack>
                </Box>
            ) : assessment.meta?.move_safe === true ? (
                <Typography variant="body2" color="success.main" sx={{ mb: 2 }}>
                    Chequeo S1–S4: sin alertas sobre la jugada hecha.
                </Typography>
            ) : null}

            {assessment.meta?.ordered_candidates?.length > 0 ? (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Candidatas motor (D1–D5)
                    </Typography>
                    <List dense disablePadding>
                        {assessment.meta.ordered_candidates.map((row) => (
                            <ListItem key={row.uci} disableGutters>
                                <ListItemText
                                    primary={`${row.category} · ${row.uci}`}
                                    primaryTypographyProps={{
                                        sx: (theme) => pgnMoveTextSx(theme),
                                        variant: 'body2',
                                    }}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            ) : null}

            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Plan de pensamiento
            </Typography>
            <List dense disablePadding>
                {(assessment.thinking_plan || []).map((step, i) => (
                    <ListItem key={`${step.node_id}-${i}`} disableGutters alignItems="flex-start">
                        <ListItemText
                            primary={`${step.node_id}: ${step.prompt_es}`}
                            secondary={step.phase}
                            primaryTypographyProps={{
                                sx: (theme) => pgnMoveTextSx(theme),
                                variant: 'body2',
                            }}
                        />
                    </ListItem>
                ))}
            </List>
        </Box>
    )
}
