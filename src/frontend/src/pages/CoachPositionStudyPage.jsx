import { Navigate, useLocation } from 'react-router-dom'
import { loadPositionFenFromSession } from '../utils/parseFenInput.js'

/** Compat: estudio FEN unificado en /coach/position. */
export default function CoachPositionStudyPage() {
    const location = useLocation()
    const fen = location.state?.fen ?? loadPositionFenFromSession()
    return (
        <Navigate
            to="/coach/position"
            replace
            state={{
                ...location.state,
                fen,
            }}
        />
    )
}
