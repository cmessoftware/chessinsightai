import { Box, Typography } from '@mui/material'
import { BETA_LABEL, PRODUCT_NAME } from '../../utils/productBrand.js'

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
                component="div"
                sx={{ opacity: 0.8, letterSpacing: 0.3, lineHeight: 1.2 }}
            >
                {BETA_LABEL}
            </Typography>
        </Box>
    )
}
