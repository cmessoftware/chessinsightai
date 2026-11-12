import { Box, Container } from '@mui/material'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import changelogText from '../../../../CHANGELOG.md?raw'

function ChangelogLink({ href, children }) {
    const external = typeof href === 'string' && /^https?:\/\//i.test(href)
    return (
        <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
        >
            {children}
        </a>
    )
}

/** FEAT-111: the beta label opens this document, rendered from CHANGELOG.md. */
export default function ChangelogPage() {
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box
                sx={{
                    '& h1': { typography: 'h4', mb: 2 },
                    '& h2': { typography: 'h5', mt: 4, mb: 1.5 },
                    '& h3': { typography: 'h6', mt: 3, mb: 1 },
                    '& p, & li': { lineHeight: 1.6 },
                    '& a': { color: 'primary.main' },
                    '& ul': { pl: 3 },
                    '& li + li': { mt: 0.5 },
                    '& code': {
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: '0.9em',
                        bgcolor: 'action.hover',
                        px: 0.5,
                        borderRadius: 0.5,
                    },
                    '& .changelog-table-wrap': { overflowX: 'auto', mt: 2 },
                    '& table': { width: '100%', borderCollapse: 'collapse', minWidth: 640 },
                    '& th, & td': {
                        border: '1px solid',
                        borderColor: 'divider',
                        px: 1,
                        py: 0.75,
                        textAlign: 'left',
                        verticalAlign: 'top',
                    },
                    '& th': { bgcolor: 'action.hover' },
                    '& th:nth-of-type(-n + 3), & td:nth-of-type(-n + 3)': {
                        whiteSpace: 'nowrap',
                    },
                }}
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        a: ChangelogLink,
                        table: ({ children }) => (
                            <div className="changelog-table-wrap">
                                <table>{children}</table>
                            </div>
                        ),
                    }}
                >
                    {changelogText}
                </ReactMarkdown>
            </Box>
        </Container>
    )
}
