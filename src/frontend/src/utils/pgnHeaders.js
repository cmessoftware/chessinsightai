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

export function escapePgnHeaderValue(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/** Seven Tag Roster for a game started on the analysis board. */
export const BLANK_STUDY_HEADER_ROWS = [
    { tag: 'Event', value: 'Nueva partida' },
    { tag: 'Site', value: '?' },
    { tag: 'Date', value: '????.??.??' },
    { tag: 'Round', value: '?' },
    { tag: 'White', value: '?' },
    { tag: 'Black', value: '?' },
    { tag: 'Result', value: '*' },
]

/** Rebuild the header block. Duplicate or invalid tags are dropped. */
export function formatPgnHeaderBlock(rows) {
    const lines = []
    const seen = new Set()
    for (const row of rows || []) {
        const tag = String(row?.tag || '').trim()
        if (!/^[A-Za-z][A-Za-z0-9]*$/.test(tag) || seen.has(tag)) continue
        seen.add(tag)
        lines.push(`[${tag} "${escapePgnHeaderValue(row.value)}"]`)
    }
    return lines.join('\n')
}

/** Replace the header block and keep the movetext, including variations. */
export function replacePgnHeaders(pgnText, rows) {
    const block = formatPgnHeaderBlock(rows)
    const text = String(pgnText || '').replace(/^\uFEFF/, '')
    const headers = extractPgnHeadersBlock(text)
    let rest = text
    if (headers) {
        const idx = text.indexOf(headers)
        rest = text.slice(idx + headers.length)
    }
    rest = rest.replace(/^(?:\r?\n)+/, '')
    if (!block) return rest.trim()
    if (!rest.trim()) return block
    return `${block}\n\n${rest.trim()}`
}

function pad2(value) {
    return String(value).padStart(2, '0')
}

/** Starting position, no moves. Date and UTC time keep each new game distinct. */
export function blankStudyPgn(now = new Date()) {
    const date = `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())}`
    const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`
    const rows = BLANK_STUDY_HEADER_ROWS.map((row) =>
        row.tag === 'Date' ? { tag: row.tag, value: date } : row,
    ).concat([
        { tag: 'UTCDate', value: date },
        { tag: 'UTCTime', value: time },
    ])
    return `${formatPgnHeaderBlock(rows)}\n\n*`
}

/** A header-only PGN needs a result token so the parser accepts the game. */
export function ensurePgnGameTerminator(pgnText) {
    const text = String(pgnText || '').trim()
    if (!text) return text
    const headers = extractPgnHeadersBlock(text)
    const rest = headers
        ? text.slice(text.indexOf(headers) + headers.length).trim()
        : text
    if (rest) return text
    return `${text}\n\n*`
}

export function upsertPgnHeaderBlock(headersBlock, tag, value) {
    const escaped = escapePgnHeaderValue(value)
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
