import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import UploadOutlinedIcon from '@mui/icons-material/UploadOutlined'
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined'
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined'

export const COACH_RETURN_PARTIDAS = '/coach/partidas'

/** Submenús Coach (FEAT-030 — shell global `AppShell`). */
export const COACH_SUB_NAV_ITEMS = [
    { label: 'Inicio', path: '/coach', icon: HomeOutlinedIcon },
    { label: 'Importar Partidas', path: '/coach/importar', icon: UploadOutlinedIcon },
    { label: 'Partidas', path: '/coach/partidas', icon: FormatListBulletedOutlinedIcon },
    { label: 'Posición (FEN)', path: '/coach/position', icon: GridOnOutlinedIcon },
    { label: 'Sparring', path: '/coach/sparring', icon: SportsEsportsOutlinedIcon },
    { label: 'Configuración', path: '/coach/configuracion', icon: SettingsOutlinedIcon },
]

export function activeCoachNavPath(pathname) {
    if (pathname === '/coach' || pathname === '/coach/') return '/coach'
    if (pathname.startsWith('/coach/position')) return '/coach/position'
    if (pathname.startsWith('/coach/partidas') || pathname.startsWith('/coach/jobs')) {
        return '/coach/partidas'
    }
    if (pathname.startsWith('/coach/games/')) return '/coach'
    if (pathname.startsWith('/coach/importar') || pathname === '/coach/import') {
        return '/coach/importar'
    }
    if (pathname.startsWith('/coach/configuracion')) {
        return '/coach/configuracion'
    }
    if (pathname.startsWith('/coach/sparring')) {
        return '/coach/sparring'
    }
    return '/coach'
}

/** Contenedor legacy: la navegación vive en `AppShell`. */
export function CoachPageLayout({ children }) {
    return children
}

export default function CoachSubNav() {
    return null
}
