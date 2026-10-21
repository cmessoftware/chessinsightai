import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Card,
    CardActionArea,
    CardContent,
    CardMedia,
    Typography,
} from '@mui/material'
import { useAuth } from '../hooks/useAuth.js'
import { logger } from '../utils/helpers.js'
import coachLogo from '../assets/coach.png'
import reportsLogo from '../assets/reports.png'

const HomePage = () => {
    const { user, hasAccessToReports } = useAuth()
    const navigate = useNavigate()

    React.useEffect(() => {
        logger.info('home', 'Usuario accedió a página principal', { user: user?.username })
    }, [user])

    const cards = [
        {
            key: 'coach',
            title: 'Coach',
            description: 'Estudiá partidas, motor live y posiciones FEN.',
            path: '/coach',
            image: coachLogo,
            show: true,
        },
        {
            key: 'reportes',
            title: 'Reportes',
            description: 'Estadísticas y análisis de tu juego.',
            path: '/reports',
            image: reportsLogo,
            show: hasAccessToReports(),
        },
    ].filter((card) => card.show)

    return (
        <Box
            sx={{
                height: { xs: 'auto', md: 'calc(100vh - 112px)' },
                maxHeight: { md: 'calc(100vh - 112px)' },
                display: 'flex',
                alignItems: 'center',
                overflow: { md: 'hidden' },
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, minmax(0, 1fr))',
                        md: `repeat(${Math.min(cards.length, 3)}, minmax(0, 1fr))`,
                    },
                    gap: { xs: 2, md: 3 },
                }}
            >
                {cards.map((card) => (
                    <Card
                        key={card.key}
                        elevation={2}
                        sx={{
                            height: { xs: 'auto', md: '100%' },
                            maxHeight: { md: 360 },
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <CardActionArea
                            onClick={() => navigate(card.path)}
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'stretch',
                            }}
                        >
                            <CardMedia
                                component="img"
                                image={card.image}
                                alt={card.title}
                                sx={{
                                    height: { xs: 140, md: 200 },
                                    objectFit: 'contain',
                                    bgcolor: '#000',
                                    p: 1.5,
                                }}
                            />
                            <CardContent sx={{ py: 1.5, px: 2 }}>
                                <Typography variant="h6" component="h2" gutterBottom>
                                    {card.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {card.description}
                                </Typography>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                ))}
            </Box>
        </Box>
    )
}

export default HomePage
