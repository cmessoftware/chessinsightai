const TAG_LINE =
    /^\[([A-Za-z][A-Za-z0-9]*)\s+"((?:\\.|[^"\\])*)"\]\s*$/

/** Tag-pair lines before movetext (supports escaped quotes in values). */
export function extractPgnHeadersBlock(pgnText) {
    const lines = []
    for (const raw of String(pgnText || '').split(/\r?\n/)) {
        const trimmed = raw.trim()
        if (TAG_LINE.test(trimmed)) {
            lines.push(trimmed)
            continue
        }
        if (!trimmed && lines.length) break
        if (lines.length) break
        if (trimmed) break
    }
    return lines.join('\n')
}

export function parsePgnHeaderTags(pgnText) {
    const tags = {}
    for (const line of extractPgnHeadersBlock(pgnText).split('\n')) {
        const m = line.match(TAG_LINE)
        if (!m) continue
        const value = m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
        tags[m[1]] = value
    }
    return tags
}

export function upsertPgnHeaderBlock(headersBlock, tag, value) {
    const escaped = String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    const line = `[${tag} "${escaped}"]`
    const lines = headersBlock ? headersBlock.split('\n') : []
    let found = false
    const out = lines.map((row) => {
        const m = row.match(/^\[([A-Za-z][A-Za-z0-9]*)\s+/)
        if (m && m[1] === tag) {
            found = true
            return line
        }
        return row
    })
    if (!found) out.push(line)
    return out.join('\n')
}

export function trailingResultFromMovetext(movetext) {
    const m = String(movetext || '').trim().match(/\s(1-0|0-1|1\/2-1\/2|\*)\s*$/)
    return m ? m[1] : null
}
