import { Box, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { BETA_LABEL, CHANGELOG_PATH, PRODUCT_NAME } from '../../utils/productBrand.js'

/** FEAT-082: ChessDash with beta-<commit> under the name. */
export default function ProductMark({
    nameVariant = 'h6',
    align = 'flex-start',
    color = 'inherit',
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: align,
                lineHeight: 1.05,
                color,
                minWidth: 0,
            }}
        >
            <Typography
                variant={nameVariant}
                component="div"
                sx={{ lineHeight: 1.15, fontWeight: 600 }}
            >
                {PRODUCT_NAME}
            </Typography>
            <Typography
                variant="caption"
                component={RouterLink}
                to={CHANGELOG_PATH}
                onClick={(event) => event.stopPropagation()}
                aria-label="Abrir el changelog"
                sx={{
                    opacity: 0.8,
                    letterSpacing: 0.3,
                    lineHeight: 1.2,
                    color: 'inherit',
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                    width: 'fit-content',
                }}
            >
                {BETA_LABEL}
            </Typography>
        </Box>
    )
}
