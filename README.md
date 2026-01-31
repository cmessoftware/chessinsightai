# CHESS TRAINER - Versión: v0.1.111-03b0772

# ♟ chess_trainer – Analysis and Training for All Chess Players

This project automates the import, analysis, labeling, and training from thousands of chess games across all skill levels (from beginners to masters), combining tactical analysis with visual exploration and personalized exercise generation using a modern tech stack with **React + Vite** frontend and **FastAPI** backend.

## 🚀 Tech Stack

### Frontend
- **React 19** + **TypeScript** - Modern component-based UI framework
- **Vite** - Fast build tool and development server
- **Material-UI (MUI)** - Professional React component library
- **React Query (@tanstack/react-query)** - Server state management
- **Chess.js** + **React-Chessboard** - Chess logic and interactive board
- **React Router Dom** - Client-side routing

### Backend  
- **FastAPI** - High-performance Python web framework
- **PostgreSQL** - Production-ready relational database
- **MLflow** - Machine learning experiment tracking
- **Stockfish** - Chess engine for move analysis
- **Docker + Docker Compose** - Containerized development environment

### Data Science & ML
- **Python** ecosystem: pandas, numpy, scikit-learn, tensorflow
- **Jupyter Notebooks** - Interactive data analysis and ML experimentation
- **Alembic** - Database migrations
- **PGN parsing** - Chess game format processing

---

## 📚 Documentation Index

### Core Documentation
- **[Changelog](./docs/CHANGELOG.md)** - Complete project changelog with version history
- **[Main README](./README.md)** - Complete project documentation (this file)  
- **[README (Español)](./docs/README_es.md)** - Documentación completa del proyecto en español
- **[Version Base (English)](./docs/VERSION_BASE.md)** - Project overview and quick start guide
- **[Version Base (Español)](./docs/VERSION_BASE_es.md)** - Descripción del proyecto y guía rápida en español
- **[Technical Roadmap](./docs/ROADMAP_TECHNICAL.md)** - 6-phase development roadmap with current status
- **[Frontend Roadmap](./docs/ROADMAP_FRONT_CHESS_TRAINER.md)** - React frontend development roadmap

### Technical Documentation
- **[MLflow PostgreSQL Integration](./docs/MLFLOW_POSTGRES_INTEGRATION.md)** - Guide for the MLflow PostgreSQL backend integration
- **[Reliable Predictions with MLflow](./docs/PREDICCIONES_FIABLES_MLFLOW.md)** - Complete guide for making reliable chess move predictions
- **[ELO Standardization Guide](./docs/ELO_STANDARDIZATION_GUIDE.md)** - Technical guide for the ELO standardization system
- **[Issue #21 Completion Report](./docs/ISSUE_21_COMPLETION_REPORT.md)** - Complete report on ELO standardization implementation
- **[Docker Development Strategy](./docs/DOCKER_DEVELOPMENT_STRATEGY.md)** - Docker development workflow guide
- **[Datasets Volumes Config](./docs/DATASETS_VOLUMES_CONFIG.md)** - Volume configuration for datasets
- **[Git LFS Setup Guide](./docs/GIT_LFS_SETUP_GUIDE.md)** - Git Large File Storage setup guide

### Development & Setup Guides
- **[Ejecutar Entorno DEV](./docs/EJECUTAR_ENTORNO_DEV.md)** - Guía completa para configurar entorno de desarrollo
- **[Feature Enhancement Guide](./docs/GENERATE_FEATURES_ENHANCEMENT.md)** - Guide for chess feature generation improvements
- **[Architecture Improvement Update](./docs/ARCHITECTURE_IMPROVEMENT_UPDATE.md)** - Latest architecture improvements and updates
- **[Postman Runner Guide](./docs/POSTMAN_RUNNER_GUIDE.md)** - API testing with Postman automation
- **[Task Completion Summary](./docs/TASK_COMPLETION_SUMMARY.md)** - Project milestones and completion status

### Training & Studies System
- **[Complete PGN Studies System](./docs/ESTUDIOS_PGN_SISTEMA_COMPLETO.md)** - Sistema completo de estudios PGN y análisis
- **[Training System Complete](./docs/TRAINING_SYSTEM_COMPLETE.md)** - Complete training resources management system
- **[Custom Studies Tutorial](./docs/TUTORIAL_ESTUDIOS_PERSONALIZADOS.md)** - Tutorial for creating personalized chess studies
- **[Datasets Report](./docs/DATASETS_REPORT.md)** - Comprehensive analysis of available chess datasets

## 🚀 Quick Start

### Option 1: Complete Environment Setup (Recommended)

#### Windows Users - One-Command Setup:
```powershell
# Complete setup: Backend + Frontend + Database
.\build_up_clean_all.ps1
```

#### Manual Setup:
```bash
# Start all services with Docker Compose
docker-compose up -d

# Install frontend dependencies and start development server
cd src/frontend
npm install
npm run dev

# Start FastAPI backend (in another terminal)
cd src/api
python -m uvicorn main:app --reload --port 8000
```

### Option 2: Development Mode

#### Start Backend API:
```powershell
# Using PowerShell tasks (recommended)
.\ds_tools.ps1 -Action StartAPI

# Or manually
cd src/api
python -m uvicorn main:app --reload --port 8000
```

#### Start Frontend:
```bash
cd src/frontend
npm run dev
```

### 🌐 Access Points:
- **Frontend (React)**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **MLflow UI**: http://localhost:5000
- **Database**: PostgreSQL on localhost:5432

### 🎯 Benefits of Current Architecture:
- **Modern UI/UX**: React + Material-UI for professional interface
- **Type Safety**: TypeScript for frontend reliability  
- **High Performance**: Vite for fast development and FastAPI for backend speed
- **Real-time Updates**: React Query for efficient server state management
- **Scalable**: Docker containerization for consistent environments
- **ML Integration**: MLflow for experiment tracking and model management

# chess_trainer
Modern chess training platform using React + TypeScript frontend, FastAPI backend, and advanced ML pipeline with MLflow integration for chess analysis and player improvement.

## 🏗️ Architecture Overview

### Frontend Architecture (React + Vite)
```
src/frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Route-based page components  
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API client services
│   ├── utils/         # Helper functions
│   └── types/         # TypeScript type definitions
├── public/            # Static assets
└── package.json       # Dependencies and scripts
```

### Backend Architecture (FastAPI)
```
src/api/
├── routers/           # API route handlers
│   ├── auth.py       # Authentication endpoints
│   ├── chess.py      # Chess-specific endpoints
│   └── logs.py       # Logging endpoints
├── models/           # Pydantic data models
├── services/         # Business logic services
├── middleware/       # Custom middleware
└── main.py          # FastAPI application entry point
```

### 🔄 Data Flow:
1. **React Frontend** makes API calls to FastAPI backend
2. **FastAPI** processes requests, interacts with PostgreSQL
3. **MLflow** tracks experiments and model performance
4. **Stockfish** provides chess engine analysis
5. **Real-time updates** via React Query state management

## 🧠 Theory on chess game analysis

To use Machine Learning (ML) and Artificial Intelligence (AI) in chess game analysis, you must first understand how game data is represented and how AIs can "learn" game patterns.

To use Machine Learning (ML) and Artificial Intelligence (AI) in chess game analysis, you must first understand how game data is represented and how AIs can "learn" game patterns.

## 1. Representation of game information
Chess games can be represented in different ways. One of the most common is the PGN (Portable Game Notation) format, a standard format used to store the moves of a game. Each move is expressed in algebraic notation, for example: "e4" or "Nf3".

**Some key elements you can analyze from a game are:**

- Opening: The first moves of the game, which are well studied in chess.

- Errors and blunders (serious mistakes): Moves that are significantly worse compared to the best possible moves.

- Accuracy: The number of correct moves made during the game.

- Result: Whether you won, lost, or drew.

- Time spent: Whether the player made impulsive moves or thought a lot before playing.

**Game features**

In Machine Learning terms, the features of the game are the data that feed the models so they can make predictions.

**Some key features could be:**

- Number of errors and blunders: This could indicate the player's general skill.

- Move accuracy: How close the player is to optimal moves.

- Openings: Whether the player prefers a specific opening (e.g., Sicilian, Ruy Lopez, etc.).

- Piece development: Whether the player follows good opening and positioning principles.

- Game score: Whether it was a win, loss, or draw.

## 2. Machine Learning applied to chess

**Objective of Machine Learning in chess**

The main objective of Machine Learning (ML) in this context is to build a model that can identify patterns or make predictions about a player's playing style or the outcome of a game, based on historical data (previous games). Depending on the type of problem, there are several ways to approach the solution:

- Classification: Predict a class (e.g., whether a game will have serious errors or not).

- Regression: Predict a continuous value (such as a player's accuracy during a game).

- Cluster analysis: Group players with similar characteristics (e.g., players who make similar mistakes).

- Outcome prediction: Determine the probability that a player will win, lose, or draw based on previous moves.

**Machine Learning models**

Some of the most used models for chess and game analysis are:

- Regression models:

    To predict a continuous variable, such as a player's accuracy or score.

- Classification models:

    To classify games according to the type of error or whether the player has an "aggressive", "defensive", etc. style.

    For example, Random Forest and Support Vector Machines (SVM) are useful for these types of tasks.

- Neural networks:

    More advanced, these networks can learn complex patterns in the data. They are used for tasks such as pattern recognition or move prediction.

    Neural networks are also used in chess for more sophisticated predictions, such as those made by AlphaZero, which uses a deep neural network to play chess.

## 3. How to apply Machine Learning to chess analysis

**Data preprocessing**

Before feeding a Machine Learning model, you need to preprocess the data to transform it into a form the model can understand. This may include:

- Data cleaning:

    - Remove or impute null values.

    - Ensure all data is in the correct format (e.g., convert dates to a proper date format or classify errors).

**Data transformation:**

- Convert moves and openings into a numeric format:

    For example, using one-hot encoding or natural language processing techniques like Word2Vec for openings.

- Normalization and scaling:

    Some features (such as accuracy) may have different ranges. Make sure to scale them so the model is not biased toward certain features.

- Model training

    Once you have preprocessed your data, you can start training your model. To do this, you must split your data into two parts:

        Training set:
        The dataset on which you train the model.

        Test set:
        The dataset the model has not seen, to evaluate its performance.

The model will learn from the features of the games, such as errors, accuracy, and openings, and will try to predict the outcome of the game or identify playing patterns.

- Model evaluation

    Once your model is trained, you must evaluate its performance using the test set. Some common metrics for evaluating classification models are:

        Accuracy: Proportion of correct predictions.

        Precision: How accurate the positive predictions are.

        Recall: How well the model detects all positive predictions.

        F1-score: A combination of precision and recall.

        Hyperparameter tuning

        Some models like Random Forest or SVM have "hyperparameters" that you can adjust to improve model performance. You can use techniques like GridSearchCV to find the best hyperparameters.

## 4. Personalized recommendations to improve play

Once the model is trained, you can use it to make personalized recommendations to players based on their playing style and previous mistakes. For example:

- Opening recommendations:

    If the player makes mistakes in a specific opening, you can suggest other safer openings.

- Move suggestions:

    Based on their style and mistakes made in previous games, the model can suggest more accurate moves or more effective strategies.

- Analysis of previous games:

    Show the player the games in which they made the most mistakes, how they could have played better, and give advice to avoid those mistakes.

# 5. Summary of next steps:

## 📋 Implementation Status

| Component                                    | Status        | Technology Stack      | Priority |
| -------------------------------------------- | ------------- | --------------------- | -------- |
| React + TypeScript Frontend                  | ✅ Completed   | React 19 + Vite       | ✅        |
| FastAPI Backend with Authentication          | ✅ Completed   | FastAPI + JWT         | ✅        |
| PostgreSQL Database with Migrations          | ✅ Completed   | PostgreSQL + Alembic  | ✅        |
| Chess Game Data Collection (PGN, APIs)       | ✅ Completed   | Python + Chess APIs   | ✅        |
| Feature Engineering and Stockfish Analysis   | ✅ Completed   | Stockfish + pandas    | ✅        |
| ML Pipeline with MLflow Tracking             | ✅ Completed   | MLflow + scikit-learn | HIGH     |
| Docker Environment Setup                     | ✅ Completed   | Docker Compose        | ✅        |
| Interactive Chess Board Component            | ✅ Completed   | React-Chessboard      | MEDIUM   |
| Game Analysis Dashboard                      | ⏳ In Progress | Material-UI + Charts  | HIGH     |
| User Management & Profiles                   | ⏳ In Progress | FastAPI + React       | MEDIUM   |
| Real-time Game Import from Chess.com/Lichess | ❌ Pending     | API Integration       | MEDIUM   |

### 🎯 Next Sprint Priorities:
1. **Complete Game Analysis Dashboard** - Visual charts and statistics
2. **User Profile Management** - Personal game history and preferences  
3. **Real-time API Integration** - Live game import from major platforms
4. **Mobile Responsiveness** - Optimize for tablet/mobile devices

### 🔧 Development Workflow:

#### Frontend Development:
```bash
cd src/frontend
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run lint         # Run ESLint checks
```

#### Backend Development:
```bash
cd src/api
python -m uvicorn main:app --reload  # Start FastAPI with hot reload
python -m pytest tests/              # Run API tests
```

#### Database Management:
```bash
alembic upgrade head     # Apply database migrations
alembic revision --autogenerate -m "description"  # Create new migration
```

## 📊 Real Datasets Analysis

The project includes comprehensive analysis tools for comparing ML model performance across different chess dataset types:

### Available Datasets:
- **Elite**: High-level players (Elo 2500+) with rich error labels
- **FIDE**: Official FIDE tournament games  
- **Novice**: Beginner players (Elo ~1200)
- **Personal**: Personal games (Chess.com/Lichess) - Most realistic error distribution
- **Stockfish**: Engine analysis data

### 🎯 ELO Standardization System
**Status: ✅ COMPLETED (Issue #21)**

The project now includes a comprehensive ELO standardization system that:
- **Cross-Platform Conversion**: Standardizes ratings from Chess.com, Lichess, and FIDE
- **Anomaly Detection**: Intelligently detects and corrects problematic ratings (e.g., 655.0 → 800)
- **Quality Metrics**: Provides detailed statistics on data quality (73.3% quality score achieved)
- **Production Ready**: 50% success rate on anomaly corrections with comprehensive logging

**Key Features:**
- Resolves runtime warnings like "Rating 655.0 outside valid range [800, 3500]"
- Handles data entry errors (missing digits, wrong scale, extreme values)
- Comprehensive test suite with 11 validation scenarios
- Real-time quality reporting and metrics

### Quick Analysis:
```powershell
# Load helpers and run analysis
. .\quick-helpers.ps1
Analyze-RealDatasets
```

### Key Findings:
- **Personal dataset** shows most realistic error distribution (good: 1,482, mistake: 726, inaccuracy: 630, blunder: 296)
- **Elite dataset** has concentrated error samples but fewer overall errors
- All datasets show high ML accuracy (1.000) indicating clean, well-structured data
- 10,000+ samples per dataset type with 34 chess-specific features each

## 📚 Technical Documentation

### Core ML Framework Documents:
- **[ML Theoretical Framework](./docs/ML_THEORETICAL_FRAMEWORK.md)** - Conceptos teóricos de algoritmos ML aplicados a chess_trainer
- **[ML Current State Analysis](./docs/ML_CURRENT_STATE_ANALYSIS.md)** - Análisis detallado del estado actual vs objetivos ML
- **[MLflow PostgreSQL Integration](./docs/MLFLOW_POSTGRES_INTEGRATION.md)** - Configuración MLflow con PostgreSQL para tracking
- **[Reliable Chess Predictions](./docs/PREDICCIONES_FIABLES_MLFLOW.md)** - Pipeline completo ML para predicciones fiables

### Current ML Implementation Status:
- **Issue #66**: ✅ Chess data preprocessing completed
- **Issue #67**: ✅ ML model training completed (superseded by #78)
- **Issue #68**: ✅ Model evaluation and optimization completed (superseded by #78)
- **Issue #74**: ✅ PGN capture and ZIP processing completed
- **Issue #75**: ✅ Stockfish features extraction completed
- **Issue #76**: ✅ Parquet datasets generation completed  
- **Issue #78**: ✅ ML Pipeline with MLflow tracking completed
- **Issue #21**: ✅ ELO standardization system completed (100% complete) - Resolves rating anomalies like 655.0 warnings
- **Issue #23**: ⏳ SHAP explainability integration pending

## 💻 Modern Development Stack

### 🎨 Frontend (React + Vite)
- **⚛️ React 19**: Latest React with concurrent features
- **🚀 Vite**: Lightning-fast build tool and dev server  
- **📘 TypeScript**: Type safety and better developer experience
- **🎁 Material-UI**: Professional, accessible component library
- **🔄 React Query**: Powerful server state management
- **♟️ Chess.js**: Robust chess game logic library
- **🏁 React Router**: Declarative client-side routing

### ⚡ Backend (FastAPI)  
- **🐍 FastAPI**: Modern, high-performance web framework
- **🔐 JWT Authentication**: Secure token-based auth
- **🗄️ PostgreSQL**: Enterprise-grade relational database
- **🔄 Alembic**: Database migration management
- **📊 MLflow**: ML experiment tracking and model registry
- **🐳 Docker**: Containerized development environment

### 🧠 Data Science & ML
- **🔬 Jupyter Notebooks**: Interactive data analysis
- **🤖 Stockfish**: World-class chess engine integration
- **📈 scikit-learn**: Machine learning algorithms
- **🐼 pandas**: Data manipulation and analysis
- **📊 numpy**: Numerical computing foundation

## 🏆 Credits

**Chess Trainer** - Modern chess analysis platform combining React + FastAPI with advanced ML capabilities.

Developed by **cmessoftware** as part of their practical work for the Data Science Diploma.

### 🤝 Contributing
This project welcomes contributions! Please check our documentation for development setup and contribution guidelines.

### 📄 License
This project is developed for educational and research purposes.

---

**Last Updated**: January 2025 - Version v0.1.107  
**Tech Stack**: React 19 + TypeScript + Vite + FastAPI + PostgreSQL + MLflow + Docker
