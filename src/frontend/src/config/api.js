/**
 * API Configuration
 * Centraliza la configuración de la API para diferentes entornos
 */

// Base URL de la API - dinámico según el entorno
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Endpoints comunes
export const API_ENDPOINTS = {
    // Auth
    AUTH_LOGIN: `${API_BASE_URL}/api/auth/login`,
    AUTH_VERIFY: `${API_BASE_URL}/api/auth/verify`,
    AUTH_LOGOUT: `${API_BASE_URL}/api/auth/logout`,

    // Chess
    CHESS_GAMES: `${API_BASE_URL}/api/chess/games`,
    CHESS_SOURCES: `${API_BASE_URL}/api/chess/games/sources`,

    // Features
    FEATURES_PROGRESS: `${API_BASE_URL}/api/features/progress`,
}

export default API_BASE_URL
