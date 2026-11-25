#!/usr/bin/env node
/**
 * Regenera docs/ai_chess_coach/roadmap/roadmap-pending-checklist.md desde trackers con estado ⬜ Todo.
 * Ejecutar tras cambiar el roadmap o antes de commit/PR que toque issues.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const SOURCES = [
    {
        section: 'Coach UI (clasificación y catálogo)',
        tableFormat: '6col',
        tracker:
            'docs/ai_chess_coach/roadmap/designs/issues-coach-move-classification-pedagogy-mini-plan.md',
        trackerLabel: 'issues-coach-move-classification-pedagogy-mini-plan.md',
    },
    {
        section: 'Análisis profundo (servidor)',
        tableFormat: '5col',
        tracker: 'docs/ai_chess_coach/roadmap/deep_analysis/issues-plan-implementacion-analisis-profundo.md',
        trackerLabel: 'issues-plan-implementacion-analisis-profundo.md',
    },
    {
        section: 'Mental 1600',
        tableFormat: '6col',
        tracker: 'docs/ai_chess_coach/roadmap/designs/coach-mental-1600-mini-plan.md',
        trackerLabel: 'coach-mental-1600-mini-plan.md',
    },
    {
        section: 'Sparring Maia (plan)',
        tableFormat: '5col',
        tracker: 'docs/ai_chess_coach/roadmap/deep_analysis/issues-plan-implementacion-sparring-maia.md',
        trackerLabel: 'issues-plan-implementacion-sparring-maia.md',
    },
    {
        section: 'Sparring Maia (servidor)',
        tableFormat: '5col',
        tracker: 'docs/ai_chess_coach/roadmap/deep_analysis/issues-sparring-maia-server-mini-plan.md',
        trackerLabel: 'issues-sparring-maia-server-mini-plan.md',
    },
]

const OUT = 'docs/ai_chess_coach/roadmap/roadmap-pending-checklist.md'
const OUT_COMPACT = 'docs/ai_chess_coach/roadmap/roadmap-pending-checklist-compact.md'

/** Título corto para compartir (columna Descripción del tracker). */
function compactItemTitle(description, maxLen = 160) {
    const d = String(description ?? '')
        .replace(/\s+/g, ' ')
        .trim()
    if (!d) return '—'
    if (d.length <= maxLen) return d
    const slice = d.slice(0, maxLen)
    const lastSpace = slice.lastIndexOf(' ')
    if (lastSpace > Math.floor(maxLen * 0.55)) {
        return `${slice.slice(0, lastSpace)}…`
    }
    return `${slice.slice(0, maxLen - 1)}…`
}

function decodeHtml(text, { plainLinks = false } = {}) {
    let out = String(text ?? '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
    if (plainLinks) {
        out = out.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    } else {
        out = out.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    }
    return out
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
}

function parseTodoRows(fileText, tableFormat = '6col') {
    const plainLinks = tableFormat === '5col'
    const rows = []
    for (const chunk of fileText.split('<tr>')) {
        if (!chunk.includes('⬜ Todo')) continue
        const cells = [...chunk.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) =>
            decodeHtml(m[1], { plainLinks }),
        )
        if (cells.length < 5) continue
        if (!cells[0] || cells[0] === 'Tipo-Id') continue

        if (tableFormat === '5col' && cells.length >= 5) {
            const [id, deps, description, , notes] = cells
            rows.push({
                id,
                tableFormat: '5col',
                priority: '—',
                deps: deps || '—',
                description,
                notes: notes || '',
            })
            continue
        }

        if (cells.length < 6) continue
        const [id, priority, deps, description, , notes] = cells
        rows.push({
            id,
            tableFormat: '6col',
            priority: priority || '—',
            deps: deps || '—',
            description,
            notes: notes || '',
        })
    }
    return rows
}

function groupRows(rows) {
    const p1 = rows.filter((r) => /^P1$/i.test(r.priority))
    const p2 = rows.filter((r) => /^P2$/i.test(r.priority))
    const rest = rows.filter((r) => !/^P[12]$/i.test(r.priority))
    const byId = (a, b) => a.id.localeCompare(b.id, 'es')
    p1.sort(byId)
    p2.sort(byId)
    rest.sort(byId)
    return { p1, p2, rest }
}

function itemLine(row) {
    if (row.tableFormat === '5col') {
        return `- [ ] **${row.id}** ⬜ Todo — ${row.description}`
    }
    const extra = row.notes ? ` — _${row.notes}_` : ''
    const deps = row.deps !== '—' ? ` _(deps: ${row.deps})_` : ''
    return `- [ ] **${row.id}** — ${row.description}${deps}${extra}`
}

function emptySectionNote(section) {
    if (section === 'Mental 1600') {
        return '_Sin ítems ⬜ Todo en `coach-mental-1600-mini-plan.md`. Los **MENT-BUG/MENT-FEAT** pendientes figuran en **Coach UI** arriba._\n'
    }
    return '_Sin ítems ⬜ Todo en este tracker._\n'
}

function renderSection(source, rows) {
    if (!rows.length) {
        return `## ${source.section}\n\n${emptySectionNote(source.section)}`
    }
    const lines = [
        `## ${source.section}`,
        '',
        `Tracker: [\`${source.trackerLabel}\`](./${path.relative('docs/ai_chess_coach/roadmap', source.tracker).replace(/\\/g, '/')})`,
        '',
    ]
    if (source.tableFormat === '5col') {
        const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id, 'es'))
        lines.push(...sorted.map(itemLine), '')
        return lines.join('\n')
    }
    const { p1, p2, rest } = groupRows(rows)
    if (p1.length) {
        lines.push('### Prioridad P1', '', ...p1.map(itemLine), '')
    }
    if (p2.length) {
        lines.push('### Prioridad P2', '', ...p2.map(itemLine), '')
    }
    if (rest.length) {
        lines.push('### Resto', '', ...rest.map(itemLine), '')
    }
    return lines.join('\n')
}

function compactItemLine(row) {
    const title = compactItemTitle(row.description)
    if (row.tableFormat === '5col') {
        return `- **${row.id}** ⬜ Todo — ${title}`
    }
    return `- **${row.id}** — ${title}`
}

function renderSectionCompact(source, rows) {
    if (!rows.length) {
        return `## ${source.section}\n\n${emptySectionNote(source.section)}`
    }
    const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id, 'es'))
    const lines = [`## ${source.section}`, '']
    for (const row of sorted) {
        lines.push(compactItemLine(row))
    }
    lines.push('')
    return lines.join('\n')
}

function loadAllSections() {
    const sections = []
    let total = 0
    for (const source of SOURCES) {
        const abs = path.join(ROOT, source.tracker)
        if (!fs.existsSync(abs)) {
            console.warn(`skip missing: ${source.tracker}`)
            continue
        }
        const text = fs.readFileSync(abs, 'utf8')
        const rows = parseTodoRows(text, source.tableFormat ?? '6col')
        total += rows.length
        sections.push({ source, rows })
    }
    return { sections, total }
}

function main() {
    const generatedAt = new Date().toISOString().slice(0, 10)
    const { sections: sectionData, total } = loadAllSections()
    const seenIds = new Set()
    const dedupeRows = (rows) =>
        rows.filter((r) => {
            if (seenIds.has(r.id)) return false
            seenIds.add(r.id)
            return true
        })

    const sections = sectionData.map(({ source, rows }) => renderSection(source, dedupeRows(rows)))
    seenIds.clear()
    const compactSections = sectionData.map(({ source, rows }) =>
        renderSectionCompact(source, dedupeRows(rows)),
    )

    const body = [
        '# Roadmap pendiente (checklist)',
        '',
        `[← Changelog](/changelog) · [Resumen para compartir](/changelog/pendientes/resumen) · [Índice del roadmap](./00-roadmap-index.md)`,
        '',
        '_Acceso: solo administradores (ruta `/changelog/pendientes`, sesión admin)._',
        '',
        `**Actualizado:** ${generatedAt} (UTC) · **Ítems:** ${total}`,
        '',
        'Lista generada desde los trackers con estado **⬜ Todo**. Regenerar:',
        '',
        '```bash',
        'node scripts/sync-roadmap-pending-checklist.mjs',
        '# o: npm run roadmap:sync-pending',
        '```',
        '',
        '_Marcar ítems aquí es solo seguimiento visual; el estado canónico sigue en cada tracker HTML._',
        '',
        ...sections,
    ].join('\n')

    const outPath = path.join(ROOT, OUT)
    fs.writeFileSync(outPath, `${body}\n`, 'utf8')
    console.log(`Wrote ${OUT} (${total} items)`)

    const compactBody = [
        '# Roadmap pendiente — resumen',
        '',
        `[Versión completa](/changelog/pendientes) · [Índice del roadmap](./00-roadmap-index.md)`,
        '',
        `**Actualizado:** ${generatedAt} (UTC) · **Ítems:** ${total}`,
        '',
        'Solo **módulo** e **ítem** (ID + título). Generado con `npm run roadmap:sync-pending`.',
        '',
        ...compactSections,
    ].join('\n')

    const compactPath = path.join(ROOT, OUT_COMPACT)
    fs.writeFileSync(compactPath, `${compactBody}\n`, 'utf8')
    console.log(`Wrote ${OUT_COMPACT}`)
}

main()