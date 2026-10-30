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

function unescapePgnHeaderValue(raw) {
    return String(raw || '').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

/** Spanish names for common PGN tags. Unknown tags keep their key. */
export const PGN_HEADER_LABELS = {
    Event: 'Evento',
    Site: 'Sitio',
    Date: 'Fecha',
    Round: 'Ronda',
    White: 'Blancas',
    Black: 'Negras',
    Result: 'Resultado',
    WhiteElo: 'Elo blancas',
    BlackElo: 'Elo negras',
    ECO: 'ECO',
    Opening: 'Apertura',
    Annotator: 'Anotador',
    StudyCategory: 'Categoría',
    TimeControl: 'Control de tiempo',
    Termination: 'Terminación',
    FEN: 'FEN',
    SetUp: 'SetUp',
}

export function parsePgnHeaderTags(pgnText) {
    const tags = {}
    for (const line of extractPgnHeadersBlock(pgnText).split('\n')) {
        const m = line.match(TAG_LINE)
        if (!m) continue
        tags[m[1]] = unescapePgnHeaderValue(m[2])
    }
    return tags
}

/** Header tags in file order: `{ tag, label, value }`. */
export function listPgnHeaderRows(pgnText) {
    const rows = []
    for (const line of extractPgnHeadersBlock(pgnText).split('\n')) {
        const m = line.match(TAG_LINE)
        if (!m) continue
        const tag = m[1]
        rows.push({
            tag,
            label: PGN_HEADER_LABELS[tag] || tag,
            value: unescapePgnHeaderValue(m[2]),
        })
    }
    return rows
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
