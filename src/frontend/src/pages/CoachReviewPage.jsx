import { Navigate, useParams } from 'react-router-dom'

/** Alias → vista de análisis de una partida. */
export default function CoachReviewPage() {
    const { gameId } = useParams()
    return <Navigate to={`/coach/games/${gameId}/analysis`} replace />
}
