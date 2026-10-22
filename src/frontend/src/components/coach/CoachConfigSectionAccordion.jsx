import React from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Typography,
} from '@mui/material'

const accordionSx = {
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    mb: 1.5,
    '&:before': { display: 'none' },
    boxShadow: 'none',
}

/** FEAT-057: grupo colapsable en Configuración. */
export default function CoachConfigSectionAccordion({
    id,
    title,
    defaultExpanded = true,
    children,
}) {
    return (
        <Accordion defaultExpanded={defaultExpanded} disableGutters sx={accordionSx}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${id}-content`} id={`${id}-header`}>
                <Typography variant="subtitle1">{title}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>{children}</AccordionDetails>
        </Accordion>
    )
}
