import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Menu,
    MenuItem,
    IconButton,
    Chip,
} from '@mui/material'
import {
    AccountCircle,
    ExitToApp,
    SwapHoriz,
    Security,
    Menu as MenuIcon,
} from '@mui/icons-material'
import { useAuth } from '../../hooks/useAuth.js'
import { logger } from '../../utils/helpers.js'
import NotificationBell from './NotificationBell.jsx'
import logo from '../../assets/logo.png'

const Navigation = ({ onOpenSidebar }) => {
    const { user, logout, isAuthenticated } = useAuth()
    const [anchorEl, setAnchorEl] = React.useState(null)
    const navigate = useNavigate()

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const handleLogout = () => {
        logger.info('navigation', 'Usuario haciendo logout')
        logout()
        handleClose()
        navigate('/login')
    }

    return (
        <AppBar position="static" sx={{ mb: 0 }}>
            <Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>
                {isAuthenticated && onOpenSidebar && (
                    <IconButton
                        color="inherit"
                        aria-label="Abrir menú"
                        onClick={onOpenSidebar}
                        edge="start"
                        sx={{ mr: 0.5 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}
                <Box
                    onClick={() => navigate(isAuthenticated ? '/' : '/login')}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mr: 2,
                        flexShrink: 0,
                        cursor: 'pointer',
                    }}
                >
                    <Box
                        component="img"
                        src={logo}
                        alt="Chess Trainer"
                        sx={{
                            height: 40,
                            width: 'auto',
                            display: 'block',
                        }}
                    />
                    <Typography variant="h6" component="div" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        Chess Trainer
                    </Typography>
                </Box>

                <Box sx={{ flexGrow: 1 }} />

                {isAuthenticated ? (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexShrink: 0,
                        }}
                    >
                        <Chip
                            icon={<SwapHoriz />}
                            label={user?.username || 'Usuario'}
                            title={
                                user?.roles?.length
                                    ? `Roles: ${user.roles.join(', ')}`
                                    : undefined
                            }
                            color="primary"
                            variant="outlined"
                            size="small"
                            sx={{
                                color: 'white',
                                borderColor: 'rgba(255,255,255,0.7)',
                                maxWidth: { xs: 120, sm: 200 },
                                '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                            }}
                        />

                        <NotificationBell />

                        <IconButton
                            size="large"
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleMenu}
                            color="inherit"
                        >
                            <AccountCircle />
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorEl}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                        >
                            <MenuItem disabled>
                                <strong>Usuario: {user?.username}</strong>
                            </MenuItem>
                            <MenuItem disabled>
                                <strong>Roles: {user?.roles?.join(', ') || 'N/A'}</strong>
                            </MenuItem>
                            <MenuItem disabled>
                                Permisos: {user?.permissions?.length || 0} permisos activos
                            </MenuItem>
                            {user?.roles?.includes('admin') && (
                                <MenuItem
                                    onClick={() => {
                                        handleClose()
                                        navigate('/admin/roles')
                                    }}
                                >
                                    <Security sx={{ mr: 1 }} />
                                    Administrar Roles
                                </MenuItem>
                            )}
                            <MenuItem onClick={handleLogout}>
                                <ExitToApp sx={{ mr: 1 }} />
                                Cerrar Sesión
                            </MenuItem>
                        </Menu>
                    </Box>
                ) : (
                    <Button color="inherit" href="/login">
                        Iniciar Sesión
                    </Button>
                )}
            </Toolbar>
        </AppBar>
    )
}

export default Navigation
