import ParsedMarkdownDoc from '../components/shared/ParsedMarkdownDoc.jsx'
import checklistText from '../../../../docs/ai_chess_coach/roadmap/roadmap-pending-checklist-compact.md?raw'

/** Resumen del roadmap (módulo + título por ítem), solo admin. */
export default function RoadmapPendingChecklistCompactPage() {
    return <ParsedMarkdownDoc markdown={checklistText} />
}