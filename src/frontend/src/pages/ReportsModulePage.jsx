import { Link as RouterLink, useLocation } from 'react-router-dom'
import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material'
import { REPORT_MENU, reportFromPath } from '../reports/reportCatalog.js'
import PrecisionReportPanel from './PrecisionReportPanel.jsx'
import RankingReportPanel from './RankingReportPanel.jsx'
import RivalReportPanel from './RivalReportPanel.jsx'
import ReportExportControls from './ReportExportControls.jsx'

/** Reports index, ranking, precision, and rival comparison. */
export default function ReportsModulePage() {
    const { pathname } = useLocation()
    const report = reportFromPath(pathname)

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                {report ? report.label : 'Módulo de Reportes'}
            </Typography>
            {report?.id === 'RPT-FEAT-03' ? (
                <RankingReportPanel report={report} />
            ) : report?.id === 'RPT-FEAT-04' ? (
                <PrecisionReportPanel report={report} />
            ) : report?.id === 'RPT-FEAT-05' ? (
                <RivalReportPanel report={report} />
            ) : report ? (
                <>
                    <Typography color="text.secondary">
                        Este informe todavía no está disponible.
                    </Typography>
                    <ReportExportControls report={report} />
                </>
            ) : (
                <>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        Elegí un informe. En cada uno se elige Markdown o PDF al generar.
                    </Typography>
                    <List dense sx={{ maxWidth: 420 }}>
                        {REPORT_MENU.map((item) => (
                            <ListItemButton key={item.id} component={RouterLink} to={item.path}>
                                <ListItemText primary={item.label} />
                            </ListItemButton>
                        ))}
                    </List>
                </>
            )}
        </Box>
    )
}
