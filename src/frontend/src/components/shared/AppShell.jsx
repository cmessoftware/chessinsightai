import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import {
    Box,
    Collapse,
    Container,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import Navigation from './Navigation.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import {
    COACH_SUB_NAV_ITEMS,
    activeCoachNavPath,
} from '../coach/CoachSubNav.jsx'

const DRAWER_WIDTH = 260
const COLLAPSED_WIDTH = 72
const STORAGE_KEY = 'appSidebarCollapsed'

function readCollapsedPreference() {
    try {
        return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
        return false
    }
}

function SidebarNav({ collapsed, isMobile, onNavigate, hasAccessToReports }) {
    const { pathname } = useLocation()
    const coachActive = activeCoachNavPath(pathname)
    const [coachOpen, setCoachOpen] = useState(() => pathname.startsWith('/coach'))

    useEffect(() => {
        if (pathname.startsWith('/coach')) setCoachOpen(true)
    }, [pathname])

    const topItems = useMemo(
        () => [{ label: 'Inicio', path: '/', icon: HomeOutlinedIcon }],
        [],
    )

    const renderLink = (item, selected) => {
        const Icon = item.icon
        const button = (
            <ListItemButton
                key={item.path}
                component={RouterLink}
                to={item.path}
                selected={selected}
                onClick={onNavigate}
                sx={{
                    borderRadius: 1,
                    minHeight: 44,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: collapsed ? 1 : 2,
                    pl: item.nested && !collapsed ? 3 : collapsed ? 1 : 2,
                }}
            >
                <ListItemIcon
                    sx={{
                        minWidth: collapsed ? 0 : 40,
                        justifyContent: 'center',
                        color: selected ? 'primary.main' : 'inherit',
                    }}
                >
                    <Icon fontSize="small" />
                </ListItemIcon>
                {!collapsed && (
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
                )}
            </ListItemButton>
        )
        if (collapsed) {
            return (
                <Tooltip key={item.path} title={item.label} placement="right">
                    <span>{button}</span>
                </Tooltip>
            )
        }
        return button
    }

    const coachSectionSelected = pathname.startsWith('/coach')

    return (
        <List dense sx={{ px: 0.5, py: 1, flex: 1 }}>
            {topItems.map((item) =>
                renderLink(item, pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))),
            )}

            <ListItemButton
                onClick={() => {
                    if (collapsed) {
                        onNavigate?.()
                    } else {
                        setCoachOpen((o) => !o)
                    }
                }}
                component={collapsed ? RouterLink : 'div'}
                to={collapsed ? '/coach' : undefined}
                selected={coachSectionSelected && collapsed}
                sx={{
                    borderRadius: 1,
                    minHeight: 44,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: collapsed ? 1 : 2,
                }}
            >
                <ListItemIcon
                    sx={{
                        minWidth: collapsed ? 0 : 40,
                        justifyContent: 'center',
                        color: coachSectionSelected ? 'primary.main' : 'inherit',
                    }}
                >
                    <PsychologyOutlinedIcon fontSize="small" />
                </ListItemIcon>
                {!collapsed && (
                    <>
                        <ListItemText primary="Coach" primaryTypographyProps={{ fontSize: 14 }} />
                        {coachOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </>
                )}
            </ListItemButton>

            {!collapsed && (
                <Collapse in={coachOpen} timeout="auto" unmountOnExit>
                    <List disablePadding dense>
                        {COACH_SUB_NAV_ITEMS.map((item) =>
                            renderLink({ ...item, nested: true }, coachActive === item.path),
                        )}
                    </List>
                </Collapse>
            )}

            {hasAccessToReports() &&
                renderLink(
                    { label: 'Reportes', path: '/reports', icon: AssessmentOutlinedIcon },
                    pathname.startsWith('/reports'),
                )}
        </List>
    )
}

export default function AppShell() {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const [mobileOpen, setMobileOpen] = useState(false)
    const [collapsed, setCollapsed] = useState(() => readCollapsedPreference())
    const { isAuthenticated, hasAccessToReports } = useAuth()

    const toggleCollapsed = useCallback(() => {
        setCollapsed((prev) => {
            const next = !prev
            try {
                localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
            } catch {
                /* ignore */
            }
            return next
        })
    }, [])

    useEffect(() => {
        if (!isMobile) setMobileOpen(false)
    }, [isMobile])

    const closeMobile = () => setMobileOpen(false)

    const drawerInner = (
        <Box
            role="navigation"
            aria-label="Principal"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                borderRight: 1,
                borderColor: 'divider',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                    px: 1,
                    py: 0.5,
                    minHeight: 48,
                }}
            >
                {!isMobile && (
                    <IconButton
                        size="small"
                        onClick={toggleCollapsed}
                        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                    >
                        {collapsed ? (
                            <MenuIcon fontSize="small" />
                        ) : (
                            <ChevronLeftIcon fontSize="small" />
                        )}
                    </IconButton>
                )}
                {!collapsed && !isMobile && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        Menú
                    </Typography>
                )}
            </Box>
            <SidebarNav
                collapsed={collapsed && !isMobile}
                isMobile={isMobile}
                onNavigate={isMobile ? closeMobile : undefined}
                hasAccessToReports={hasAccessToReports}
            />
        </Box>
    )

    const drawerWidth = collapsed && !isMobile ? COLLAPSED_WIDTH : DRAWER_WIDTH

    if (!isAuthenticated) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navigation />
                <Container component="main" maxWidth="xl" sx={{ flex: 1, py: 2 }}>
                    <Outlet />
                </Container>
            </Box>
        )
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navigation onOpenSidebar={isMobile ? () => setMobileOpen(true) : undefined} />
            <Box sx={{ display: 'flex', flex: 1, alignItems: 'stretch' }}>
                {isMobile ? (
                    <Drawer
                        anchor="left"
                        variant="temporary"
                        open={mobileOpen}
                        onClose={closeMobile}
                        ModalProps={{ keepMounted: true }}
                        sx={{
                            '& .MuiDrawer-paper': {
                                width: DRAWER_WIDTH,
                                boxSizing: 'border-box',
                            },
                        }}
                    >
                        {drawerInner}
                    </Drawer>
                ) : (
                    <Drawer
                        anchor="left"
                        variant="permanent"
                        open
                        sx={{
                            width: drawerWidth,
                            flexShrink: 0,
                            '& .MuiDrawer-paper': {
                                width: drawerWidth,
                                position: 'relative',
                                boxSizing: 'border-box',
                                overflowX: 'hidden',
                                transition: theme.transitions.create('width', {
                                    easing: theme.transitions.easing.sharp,
                                    duration: theme.transitions.duration.shortest,
                                }),
                            },
                        }}
                    >
                        {drawerInner}
                    </Drawer>
                )}
                <Container
                    component="main"
                    maxWidth="xl"
                    sx={{ flex: 1, minWidth: 0, py: 2 }}
                >
                    <Outlet />
                </Container>
            </Box>
        </Box>
    )
}
