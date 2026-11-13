/** PNG of a ranking chart, embedded in the Markdown report. */

import { chartLayout, formatRating } from './rankingReport.js'

function crc32(bytes) {
    let crc = 0xffffffff
    for (const byte of bytes) {
        crc ^= byte
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
        }
    }
    return (~crc) >>> 0
}

function adler32(bytes) {
    let a = 1
    let b = 0
    for (const byte of bytes) {
        a = (a + byte) % 65521
        b = (b + a) % 65521
    }
    return ((b << 16) | a) >>> 0
}

function zlibStore(data) {
    const parts = [0x78, 0x01]
    let offset = 0
    while (offset < data.length) {
        const length = Math.min(65535, data.length - offset)
        const last = offset + length >= data.length
        parts.push(last ? 0x01 : 0x00, length & 0xff, (length >> 8) & 0xff, (~length) & 0xff, ((~length) >> 8) & 0xff)
        for (let index = 0; index < length; index += 1) parts.push(data[offset + index])
        offset += length
    }
    const sum = adler32(data)
    parts.push((sum >>> 24) & 0xff, (sum >>> 16) & 0xff, (sum >>> 8) & 0xff, sum & 0xff)
    return Uint8Array.from(parts)
}

function pngChunk(type, data) {
    const out = new Uint8Array(12 + data.length)
    const view = new DataView(out.buffer)
    view.setUint32(0, data.length)
    out.set(type, 4)
    out.set(data, 8)
    view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
    return out
}

function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0)
    const out = new Uint8Array(total)
    let offset = 0
    for (const part of parts) {
        out.set(part, offset)
        offset += part.length
    }
    return out
}

function encodePng(width, height, rgb) {
    const ihdr = new Uint8Array(13)
    const view = new DataView(ihdr.buffer)
    view.setUint32(0, width)
    view.setUint32(4, height)
    ihdr[8] = 8
    ihdr[9] = 2
    const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
    const idat = zlibStore(rgb)
    return concatBytes([
        signature,
        pngChunk(Uint8Array.from([73, 72, 68, 82]), ihdr),
        pngChunk(Uint8Array.from([73, 68, 65, 84]), idat),
        pngChunk(Uint8Array.from([73, 69, 78, 68]), new Uint8Array()),
    ])
}

function paint(rgb, width, height, x, y, red, green, blue) {
    const px = Math.round(x)
    const py = Math.round(y)
    if (px < 0 || py < 0 || px >= width || py >= height) return
    const offset = py * (width * 3 + 1) + 1 + px * 3
    rgb[offset] = red
    rgb[offset + 1] = green
    rgb[offset + 2] = blue
}

function stroke(rgb, width, height, x0, y0, x1, y1, color) {
    let x = Math.round(x0)
    let y = Math.round(y0)
    const endX = Math.round(x1)
    const endY = Math.round(y1)
    const dx = Math.abs(endX - x)
    const dy = Math.abs(endY - y)
    const stepX = x < endX ? 1 : -1
    const stepY = y < endY ? 1 : -1
    let error = dx - dy
    for (;;) {
        paint(rgb, width, height, x, y, color[0], color[1], color[2])
        if (x === endX && y === endY) break
        const doubled = 2 * error
        if (doubled > -dy) {
            error -= dy
            x += stepX
        }
        if (doubled < dx) {
            error += dx
            y += stepY
        }
    }
}

export function chartPngBytes(series) {
    const layout = chartLayout(series)
    if (!layout) return ''
    const { width, height } = layout
    const rgb = new Uint8Array((width * 3 + 1) * height)
    for (let y = 0; y < height; y += 1) {
        const row = y * (width * 3 + 1)
        for (let x = 0; x < width; x += 1) {
            const offset = row + 1 + x * 3
            rgb[offset] = 255
            rgb[offset + 1] = 255
            rgb[offset + 2] = 255
        }
    }
    const black = [30, 30, 30]
    const blue = [21, 101, 192]
    stroke(rgb, width, height, layout.axis.left, layout.axis.top, layout.axis.left, layout.axis.bottom, black)
    stroke(rgb, width, height, layout.axis.left, layout.axis.bottom, layout.axis.right, layout.axis.bottom, black)
    for (let index = 1; index < layout.points.length; index += 1) {
        const previous = layout.points[index - 1]
        const point = layout.points[index]
        stroke(rgb, width, height, previous.x, previous.y, point.x, point.y, blue)
    }
    for (const point of layout.points) {
        for (let dy = -2; dy <= 2; dy += 1) {
            for (let dx = -2; dx <= 2; dx += 1) {
                if (dx * dx + dy * dy <= 4) paint(rgb, width, height, point.x + dx, point.y + dy, blue[0], blue[1], blue[2])
            }
        }
    }
    return encodePng(width, height, rgb)
}

export function chartMarkdown(chart, filename) {
    const layout = chartLayout(chart.series)
    if (!layout) return `${chart.title}: hace falta más de una partida para el gráfico.`
    const yLabels = layout.yTicks.map((tick) => formatRating(tick.rating)).join(' · ')
    const xLabels = layout.xTicks.map((tick) => tick.label).join(' · ')
    const valueLabel = chart.valueLabel || 'Ranking'
    return `${chart.title}\n\n${valueLabel}: ${yLabels}\n\n![${chart.title}](${filename})\n\nFechas: ${xLabels}`
}
