import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { fetchSparringStatus } from '../services/sparringService.js'

export default function CoachSparringPage() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['sparring', 'status'],
    queryFn: fetchSparringStatus,
    staleTime: 60_000,
  })

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: 2, px: { xs: 1, sm: 2 } }}>
      <Typography variant="h5" gutterBottom>
        Sparring vs Maia
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Partidas en vivo contra Maia (servidor). El tablero de juego llegará con SPAR-08; aquí
        ves si el backend está configurado (SPAR-01 / SPAR-03).
      </Typography>

      {isLoading && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} />
          <Typography variant="body2">Consultando estado…</Typography>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          No se pudo leer <code>/api/v1/sparring/status</code>. ¿API y login activos?
        </Alert>
      )}

      {data && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={data.mvp_ready ? 'MVP listo' : 'MVP en desarrollo'}
                color={data.mvp_ready ? 'success' : 'default'}
                size="small"
              />
              <Chip
                label={data.maia_config_ok ? 'Maia config OK' : 'Maia config error'}
                color={data.maia_config_ok ? 'success' : 'warning'}
                size="small"
              />
              {data.provider && (
                <Chip label={`provider: ${data.provider}`} size="small" variant="outlined" />
              )}
            </Stack>

            {data.maia_config_error && (
              <Alert severity="warning">{data.maia_config_error}</Alert>
            )}

            {data.capabilities && (
              <Typography variant="body2" component="div">
                Motor: <strong>{data.capabilities.model_name}</strong>
                {data.capabilities.model_version
                  ? ` (${data.capabilities.model_version})`
                  : ''}
                <br />
                Elo efectivo: {data.capabilities.rating_min}–{data.capabilities.rating_max}
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary">
              Siguiente hito backend: {data.next_milestone} (sesiones). Plan:{' '}
              <Link
                href="https://github.com/cmessoftware/chessinsightai/blob/main/docs/ai_chess_coach/roadmap/deep_analysis/issues-plan-implementacion-sparring-maia.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                SPAR roadmap
              </Link>
            </Typography>
          </Stack>
        </Paper>
      )}
    </Box>
  )
}
