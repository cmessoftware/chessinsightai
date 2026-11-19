import ParsedMarkdownDoc from '../components/shared/ParsedMarkdownDoc.jsx'
import checklistText from '../../../../docs/ai_chess_coach/roadmap/roadmap-pending-checklist.md?raw'

/** Checklist ⬜ Todo del roadmap, enlazado desde la cabecera del changelog. */
export default function RoadmapPendingChecklistPage() {
    return <ParsedMarkdownDoc markdown={checklistText} />
}