import { Box, Container, Typography } from '@mui/material'
import changelogText from '../../../../CHANGELOG.md?raw'

/** FEAT-111: the beta label opens this document. */
export default function ChangelogPage() {
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
                Changelog
            </Typography>
            <Box
                component="pre"
                sx={{
                    m: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    lineHeight: 1.5,
                }}
            >
                {changelogText}
            </Box>
        </Container>
    )
}
