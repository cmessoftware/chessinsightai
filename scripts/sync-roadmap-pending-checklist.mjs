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
        tracker:
            'docs/ai_chess_coach/roadmap/designs/issues-coach-move-classification-pedagogy-mini-plan.md',
        trackerLabel: 'issues-coach-move-classification-pedagogy-mini-plan.md',
    },
    {
        section: 'Análisis profundo (servidor)',
        tracker: 'docs/ai_chess_coach/roadmap/deep_analysis/issues-plan-implementacion-analisis-profundo.md',
        trackerLabel: 'issues-plan-implementacion-analisis-profundo.md',
    },
    {
        section: 'Mental 1600',
        tracker: 'docs/ai_chess_coach/roadmap/designs/coach-mental-1600-mini-plan.md',
        trackerLabel: 'coach-mental-1600-mini-plan.md',
    },
    {
        section: 'Sparring Maia (plan)',
        tracker: 'docs/ai_chess_coach/roadmap/deep_analysis/issues-plan-implementacion-sparring-maia.md',
        trackerLabel: 'issues-plan-implementacion-sparring-maia.md',
    },
    {
        section: 'Sparring Maia (servidor)',
        tracker: 'docs/ai_chess_coach/roadmap/deep_analysis/issues-sparring-maia-server-mini-plan.md',
        trackerLabel: 'issues-sparring-maia-server-mini-plan.md',
    },
]

const OUT = 'docs/ai_chess_coach/roadmap/roadmap-pending-checklist.md'

function decodeHtml(text) {
    return String(text ?? '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
}

function parseTodoRows(fileText) {
    const rows = []
    for (const chunk of fileText.split('<tr>')) {
        if (!chunk.includes('⬜ Todo')) continue
        const cells = [...chunk.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => decodeHtml(m[1]))
        if (cells.length < 5) continue
        const [id, priority, deps, description, , notes] = cells
        if (!id || id === 'Tipo-Id') continue
        rows.push({
            id,
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
    const extra = row.notes ? ` — _${row.notes}_` : ''
    const deps = row.deps !== '—' ? ` _(deps: ${row.deps})_` : ''
    return `- [ ] **${row.id}** — ${row.description}${deps}${extra}`
}

function renderSection(source, rows) {
    if (!rows.length) {
        return `## ${source.section}\n\n_Sin ítems ⬜ Todo en este tracker._\n`
    }
    const { p1, p2, rest } = groupRows(rows)
    const lines = [
        `## ${source.section}`,
        '',
        `Tracker: [\`${source.trackerLabel}\`](./${path.relative('docs/ai_chess_coach/roadmap', source.tracker).replace(/\\/g, '/')})`,
        '',
    ]
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

function main() {
    const generatedAt = new Date().toISOString().slice(0, 10)
    const sections = []
    let total = 0

    for (const source of SOURCES) {
        const abs = path.join(ROOT, source.tracker)
        if (!fs.existsSync(abs)) {
            console.warn(`skip missing: ${source.tracker}`)
            continue
        }
        const text = fs.readFileSync(abs, 'utf8')
        const rows = parseTodoRows(text)
        total += rows.length
        sections.push(renderSection(source, rows))
    }

    const body = [
        '# Roadmap pendiente (checklist)',
        '',
        `[← Changelog](/changelog) · [Índice del roadmap](./00-roadmap-index.md)`,
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
}

main()