/** RPT-FEAT-02: each report downloads as Markdown or PDF. The user picks the format. */

import { chartMarkdown, chartPngBytes } from './chartImage.js'
import { chartLayout, formatRating } from './rankingReport.js'

export const REPORT_FORMATS = [
    { id: 'markdown', label: 'Markdown' },
    { id: 'pdf', label: 'PDF' },
]

const PENDING_BODY =
    'Este informe todavía no está disponible. El archivo comprueba el formato elegido.'

export function reportFileSlug(label) {
    return label
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

export function reportDocument(report, generatedAt = new Date(), paragraphs = null) {
    const body = Array.isArray(paragraphs) && paragraphs.length ? paragraphs : [PENDING_BODY]
    return {
        title: report.label,
        generatedAt,
        paragraphs: body,
    }
}

function formatStamp(date) {
    return date.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

export function renderReportMarkdown(doc, formatLabel, figures = []) {
    const body = doc.paragraphs.map((paragraph) => paragraph.trim()).join('\n\n')
    const images = (figures || []).map((figure) => figure.markdown).filter(Boolean).join('\n\n')
    return `# ${doc.title}\n\nGenerado: ${formatStamp(doc.generatedAt)}\n\nFormato: ${formatLabel}\n\n${body}${images ? `\n\n${images}` : ''}\n`
}

function chartFigures(slug, charts) {
    return (charts || []).flatMap((chart, index) => {
        const bytes = chartPngBytes(chart.series, chart.comparison)
        if (!bytes?.length) return []
        const filename = (charts || []).length === 1 ? `${slug}.png` : `${slug}-${index + 1}.png`
        return [{ filename, bytes, markdown: chartMarkdown(chart, filename) }]
    })
}

function wrapText(text, maxChars) {
    const words = String(text).split(/\s+/).filter(Boolean)
    const lines = []
    let current = ''
    for (const word of words) {
        const next = current ? `${current} ${word}` : word
        if (next.length > maxChars && current) {
            lines.push(current)
            current = word
        } else {
            current = next
        }
    }
    if (current) lines.push(current)
    return lines.length ? lines : ['']
}

function pdfEscape(text) {
    let out = ''
    for (const ch of text) {
        const code = ch.codePointAt(0)
        if (ch === '\\' || ch === '(' || ch === ')') {
            out += `\\${ch}`
        } else if (code >= 32 && code <= 255) {
            out += ch
        } else if (code > 0xffff) {
            out += '?'
        } else {
            out += '?'
        }
    }
    return out
}

function encodeLatin1(text) {
    const bytes = new Uint8Array(text.length)
    for (let i = 0; i < text.length; i += 1) {
        bytes[i] = text.charCodeAt(i) & 0xff
    }
    return bytes
}

function pageStream(lines) {
    const commands = ['BT', '/F1 16 Tf', '54 740 Td']
    lines.forEach((line, index) => {
        if (index === 1) commands.push('/F1 11 Tf')
        commands.push(`(${pdfEscape(line.text)}) Tj`)
        if (index < lines.length - 1) commands.push('0 -16 Td')
    })
    commands.push('ET')
    return commands.join('\n')
}

function num(value) {
    return Number(value).toFixed(2)
}

function chartPageStream(chart) {
    const layout = chartLayout(chart.series, chart.comparison)
    if (!layout) {
        return pageStream([{ text: chart.title }, { text: 'Hace falta más de una partida para el gráfico.' }])
    }
    const originX = 36
    const originY = 80
    const scaleX = 520 / layout.width
    const scaleY = 460 / layout.height
    const xOf = (value) => originX + value * scaleX
    const yOf = (value) => originY + (layout.height - value) * scaleY
    const commands = [
        'BT',
        '/F1 14 Tf',
        `54 740 Td (${pdfEscape(chart.title)}) Tj`,
        'ET',
        '1 w',
        '0 0 0 RG',
        `${num(xOf(layout.axis.left))} ${num(yOf(layout.axis.top))} m`,
        `${num(xOf(layout.axis.left))} ${num(yOf(layout.axis.bottom))} l S`,
        `${num(xOf(layout.axis.left))} ${num(yOf(layout.axis.bottom))} m`,
        `${num(xOf(layout.axis.right))} ${num(yOf(layout.axis.bottom))} l S`,
    ]
    layout.yTicks.forEach((tick) => {
        commands.push(
            'BT',
            '/F1 9 Tf',
            `${num(xOf(layout.axis.left) - 36)} ${num(yOf(tick.y) - 3)} Td (${pdfEscape(formatRating(tick.rating))}) Tj`,
            'ET',
        )
    })
    layout.xTicks.forEach((tick) => {
        commands.push(
            'BT',
            '/F1 9 Tf',
            `${num(xOf(tick.x) - 24)} ${num(yOf(layout.axis.bottom) - 16)} Td (${pdfEscape(tick.label)}) Tj`,
            'ET',
        )
    })
    const [first, ...rest] = layout.points
    if (first) {
        commands.push(`${num(xOf(first.x))} ${num(yOf(first.y))} m`)
        rest.forEach((point) => commands.push(`${num(xOf(point.x))} ${num(yOf(point.y))} l`))
        commands.push('0.08 0.4 0.75 RG', '1.5 w', 'S')
    }
    const [other, ...otherRest] = layout.comparison || []
    if (other) {
        commands.push(`${num(xOf(other.x))} ${num(yOf(other.y))} m`)
        otherRest.forEach((point) => commands.push(`${num(xOf(point.x))} ${num(yOf(point.y))} l`))
        commands.push('0.83 0.18 0.18 RG', '1.5 w', 'S')
    }
    return commands.join('\n')
}

export function renderReportPdf(doc, formatLabel, charts = []) {
    const stamp = `Generado: ${formatStamp(doc.generatedAt)}`
    const formatLine = `Formato: ${formatLabel}`
    const bodyLines = doc.paragraphs.flatMap((paragraph) =>
        String(paragraph)
            .split('\n')
            .flatMap((line) => wrapText(line, 85)),
    )
    const logical = [
        { text: doc.title },
        { text: stamp },
        { text: formatLine },
        { text: '' },
        ...bodyLines.map((text) => ({ text })),
    ]
    const pageSize = 40
    const pages = []
    for (let start = 0; start < logical.length; start += pageSize) {
        pages.push(pageStream(logical.slice(start, start + pageSize)))
    }
    for (const chart of charts || []) pages.push(chartPageStream(chart))

    const objects = []
    const fontId = 3 + pages.length * 2
    const pageIds = pages.map((_, index) => 3 + index * 2)
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
    objects.push(
        `2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`,
    )
    pages.forEach((stream, index) => {
        const pageId = pageIds[index]
        const contentId = pageId + 1
        objects.push(
            `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>\nendobj\n`,
        )
        const streamBody = `${stream}\n`
        const encoded = encodeLatin1(streamBody)
        objects.push(
            `${contentId} 0 obj\n<< /Length ${encoded.length} >>\nstream\n${streamBody}endstream\nendobj\n`,
        )
    })
    objects.push(
        `${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`,
    )

    let pdf = '%PDF-1.4\n'
    const offsets = [0]
    for (const object of objects) {
        offsets.push(encodeLatin1(pdf).length)
        pdf += object
    }
    const xrefStart = encodeLatin1(pdf).length
    const count = objects.length + 1
    let xref = `xref\n0 ${count}\n`
    xref += '0000000000 65535 f \n'
    for (let i = 1; i < offsets.length; i += 1) {
        xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
    }
    pdf += xref
    pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
    return encodeLatin1(pdf)
}

export function fileForReport(report, formatId, generatedAt = new Date(), paragraphs = null, charts = null) {
    const format = REPORT_FORMATS.find((item) => item.id === formatId)
    if (!format) {
        throw new Error(`Formato no soportado: ${formatId}`)
    }
    const doc = reportDocument(report, generatedAt, paragraphs)
    const slug = reportFileSlug(report.label)
    const figures = chartFigures(slug, charts)
    if (format.id === 'pdf') {
        return {
            filename: `${slug}.pdf`,
            mime: 'application/pdf',
            bytes: renderReportPdf(doc, format.label, charts),
        }
    }
    return {
        filename: `${slug}.md`,
        mime: 'text/markdown;charset=utf-8',
        bytes: new TextEncoder().encode(renderReportMarkdown(doc, format.label, figures)),
        extras: figures.map((figure) => ({
            filename: figure.filename,
            mime: 'image/png',
            bytes: figure.bytes,
        })),
    }
}

function saveFile(file) {
    const blob = new Blob([file.bytes], { type: file.mime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

export function downloadReportFile(file) {
    saveFile(file)
    for (const extra of file.extras || []) saveFile(extra)
}
