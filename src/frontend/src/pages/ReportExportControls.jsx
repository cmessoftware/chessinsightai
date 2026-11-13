import { useState } from 'react'
import {
    Box,
    Button,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    Typography,
} from '@mui/material'
import { REPORT_FORMATS, downloadReportFile, fileForReport } from '../reports/reportExport.js'

export default function ReportExportControls({
    report,
    paragraphs = null,
    charts = null,
    controlId = 'report-format',
    format: formatProp,
    onFormatChange,
    downloaded: downloadedProp,
    onDownloaded,
}) {
    const [localFormat, setLocalFormat] = useState(REPORT_FORMATS[0].id)
    const [localDownloaded, setLocalDownloaded] = useState('')
    const format = formatProp ?? localFormat
    const setFormat = onFormatChange ?? setLocalFormat
    const downloaded = downloadedProp ?? localDownloaded
    const setDownloaded = onDownloaded ?? setLocalDownloaded

    const generate = () => {
        const file = fileForReport(report, format, new Date(), paragraphs, charts)
        downloadReportFile(file)
        setDownloaded(file.filename)
    }

    return (
        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl>
                <FormLabel id={`${controlId}-label`}>Formato</FormLabel>
                <RadioGroup
                    row
                    aria-labelledby={`${controlId}-label`}
                    value={format}
                    onChange={(event) => {
                        setFormat(event.target.value)
                        setDownloaded('')
                    }}
                >
                    {REPORT_FORMATS.map((item) => (
                        <FormControlLabel
                            key={item.id}
                            value={item.id}
                            control={<Radio />}
                            label={item.label}
                        />
                    ))}
                </RadioGroup>
            </FormControl>
            <Button variant="contained" onClick={generate}>
                Generar
            </Button>
            {downloaded ? (
                <Typography variant="body2" color="text.secondary">
                    Se descargó {downloaded}.
                </Typography>
            ) : null}
        </Box>
    )
}
