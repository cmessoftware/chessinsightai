import React from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Typography,
} from '@mui/material'
import CoachEvalCpChart from './CoachEvalCpChart.jsx'

const accordionSx = {
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    mb: 1.5,
    '&:before': { display: 'none' },
    boxShadow: 'none',
}

/** FEAT-070: gráfico cp colapsable (expandido por defecto). */
export default function CoachEvalChartCollapsible(props) {
    return (
        <Accordion defaultExpanded disableGutters sx={accordionSx}>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="coach-eval-chart-content"
                id="coach-eval-chart-header"
            >
                <Typography variant="subtitle2">Gráfico de evaluación</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 1, pb: 1 }}>
                <CoachEvalCpChart {...props} />
            </AccordionDetails>
        </Accordion>
    )
}
