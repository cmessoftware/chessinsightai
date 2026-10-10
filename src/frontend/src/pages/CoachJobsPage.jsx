import { Navigate, useLocation } from 'react-router-dom'
import { COACH_RETURN_PARTIDAS } from '../components/coach/CoachSubNav.jsx'

/** Compat: /coach/jobs → tab Partidas. */
export default function CoachJobsPage() {
    const location = useLocation()
    return <Navigate to={COACH_RETURN_PARTIDAS} replace state={location.state} />
}
