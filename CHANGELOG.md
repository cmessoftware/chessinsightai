# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.1.103] - 2026-03-26

### Added
- **Arquitectura Orquestada - Fase 0 Completada** - Documentación técnica completa para rediseño del módulo ai_chess_coach
- **Especificación Técnica** (`docs/arquitectura-orquestada/00-fase0-especificacion-tecnica.md`) - 1,200 líneas detallando:
  - 5 componentes arquitectónicos (Planner, Executor, Critic, Memory, Explainer)
  - 5 reglas de validación programáticas del Critic
  - Implementación completa de AnalyzeGameUseCase con Clean Architecture
  - Estrategia de testing, métricas y patrones de diseño
- **Interfaces y Schemas JSON** (`docs/arquitectura-orquestada/00-fase0-interfaces-json.md`) - 1,100 líneas con:
  - 7 schemas completos con validación (AnalysisOptions, AnalysisPlan, ExecutionResult, CriticResult, EnrichedResult, AnalysisReport, PlayerPatterns)
  - Modelos Pydantic con validadores personalizados
  - Ejemplos de uso y documentación OpenAPI
- **Plan de Migración** (`docs/arquitectura-orquestada/00-fase0-plan-migracion.md`) - 1,200 líneas cubriendo:
  - Estrategia de migración en 5 fases sin breaking changes
  - Implementación de dual write/read con feature flags
  - Migraciones Alembic para esquema v2.0
  - Plan de rollback y estrategia de pruebas
- **Diagramas de Arquitectura** (`docs/arquitectura-orquestada/00-fase0-diagramas-arquitectura.md`) - 930 líneas con 10 diagramas Mermaid:
  - Componentes (arquitectura de alto nivel con 4 capas)
  - Secuencia (flujo completo AnalyzeGameUseCase)
  - Flujo de datos (pipeline de transformación)
  - Base de datos (ERD con esquema v2.0)
  - Despliegue (topología Docker con puertos)
  - Estados del Critic (máquina de estados con validaciones)
  - Ciclo de vida (proceso end-to-end desde PGN hasta frontend)
  - Migración (timeline de 5 fases visualizado)
  - Dependencias (relaciones entre servicios)
  - Feature flags (control de rollback y versiones)
- **README Navegable** (`docs/arquitectura-orquestada/README.md`) - 350 líneas con índice de navegación y guía de referencia

### Changed
- **Issue Management** - Creados 6 issues para fases 0-5 (#85-90) del proyecto de Arquitectura Orquestada
- **Branch Strategy** - Creadas 6 ramas de feature para implementación por fases

### Fixed
- **Git Cleanup** - Eliminadas 10 ramas obsoletas de desarrollo anterior
- **Issue Organization** - Cerrados 10 issues legacy para mantener enfoque en nueva arquitectura

### Technical Details
- **Total Documentation**: ~4,400 líneas de especificación técnica
- **Branch**: `feature/arquitectura-orquestada-fase0-documentacion`
- **Commits**: 5 commits (b2c60c8, 58538fc, f678c97, 8f3d7f0, 1e8ec3d)
- **Issue Closed**: #85 - Fase 0: Documentación y Preparación
- **Architecture Pattern**: Clean Architecture + Planner/Executor/Critic/Memory/Explainer
- **Migration Strategy**: 5 phases with feature flags (ENABLE_ORCHESTRATED_ANALYSIS, ENABLE_DUAL_WRITE, PREFER_VERSION)
- **Design Patterns**: Use Case, Strategy, Chain of Responsibility, Builder, Repository, Facade

### Next Steps
- **Fase 1**: Implementación de Planner + Executor + Memory (Issue #86)
- **Database**: Crear migraciones Alembic para tablas move_analyses y player_patterns
- **Services**: Implementar PlannerService, ExecutorService, MemoryService con feature flags
- **Testing**: Unit tests e integration tests para flujo Planner → Executor → Memory

---

## [v0.1.43] - 2025-06-30

### Added
- **Documentation Structure Enhancement** - Comprehensive documentation improvements addressing issue #62
- **Spanish Language Documentation** - Complete Spanish versions for all major documentation files:
  - `src/architecture_es.md` - System architecture diagram and explanations in Spanish
  - `tests/README_es.md` - Complete testing guide with runner documentation in Spanish
  - `DATASETS_VOLUMES_CONFIG_es.md` - Docker volumes configuration for dataset sharing in Spanish
- **Documentation Index** - Organized navigation structure replacing requirements sections in both VERSION_BASE files
- **Docker Installation References** - Clear references to automatic dependency installation via:
  - `Dockerfile` - Main application container setup
  - `dockerfile.notebooks` - Jupyter environment setup
  - `requirements.txt` - Complete Python dependencies
  - `docker-compose.yml` - Container orchestration

### Changed
- **VERSION_BASE Files Restructured** - Documentation index now serves as primary navigation replacing basic requirements section
- **Cross-Reference Enhancement** - Better organization and linking between English and Spanish documentation versions
- **Issue Management Optimization** - Removed #MIGRATED-TODO keys from English version to prevent duplicate GitHub issues

### Fixed
- **Docker Build Issues** - Resolved pytest package installation error in Dockerfile (issue #62)
- **Documentation Organization** - Logical categorization into Core Documentation, Configuration, Architecture, Testing, and Reports sections

### Technical Details
- **Commit**: `6f8d69b6fa66173cf4e4e13d385fc061fef7ca02`
- **Author**: Sergio Salanitri
- **Date**: Mon Jun 30 15:06:47 2025 -0300
- **Branch**: `62-compartir-datasets-ente-containers`

---

## Previous Versions

### [v0.1.42] - 2025-06-30
- **Fixed Docker build**: Remove pytest packages from apt-get install
- **Resolved build error**: 'E: Unable to locate package pytest'
- **Technical Details**: Commit `e6619b7` - Fixes #62, moved pytest packages to pip installation

### [v0.1.41] - 2025-06-30
- **Git LFS Configuration**: Added Docker Git LFS support and selective volume sharing
- **Docker Updates**: Enhanced dockerfile and dockerfile.notebooks with proper Git LFS installation
- **Documentation**: Created comprehensive dataset volume sharing documentation
- **Windows Support**: Added Windows setup guide and LFS usage documentation
- **Volume Sharing**: Updated docker-compose.yml for selective export/models sharing between containers

### [v0.1.40] - 2025-06-30
- **Source Parameter Support**: Added source parameter in feature generation process (issue #59)
- **Testing Enhancements**: Associated tests for source parameter functionality
- **Feature Filtering**: Added filter by source in generate_feature process (issue #56)
- **Bug Fixes**: Fixed max-games control failure

### [v0.1.39] - 2025-06-29
- **PostgreSQL Migration**: Migrated entire system from SQLite to PostgreSQL
- **Testing Suite**: Added comprehensive tests for analyze_tactics_parallel
- **Requirements Update**: Updated requirements.txt with all references (app, notebooks, and tests)
- **Pipeline Improvements**: Enhanced analyze_tactics process with fixes and optimizations

### [v0.1.38] - 2025-06-26
- **Git LFS Setup**: Configured Git LFS for large files and processed games
- **Performance**: Optimized storage for large dataset files

## Major Releases

### [v0.2] - 2025-06-14
- **Major Version Update**: New stable version with enhanced features
- **Commit**: `09eacce` - Significant system improvements and optimizations

### [v0.1] - 2025-05-31  
- **Initial Stable Release**: Backend stabilization and core functionality
- **Training Dataset**: Successfully generating training_dataset.csv
- **Commit**: `30f47e3` - First stable version with working training dataset generation

## Recent Feature Development (June 2025)

### Dataset and Source Management
- **Multi-source Support**: Enhanced support for multiple datasets (issue #8)
- **Source Filtering**: Improved feature generation with source-based filtering
- **Data Processing**: Optimized pipeline for different data sources

### Infrastructure and DevOps  
- **Docker Optimization**: Complete containerization with Git LFS support
- **PostgreSQL Migration**: Full database migration from SQLite to PostgreSQL
- **Volume Sharing**: Intelligent dataset sharing between containers
- **Testing Framework**: Comprehensive test suite implementation

### Documentation and Localization
- **Bilingual Documentation**: Complete Spanish translations for all major docs
- **Architecture Documentation**: Detailed system architecture diagrams
- **Testing Guides**: Comprehensive testing documentation and runner guides
- **Installation Automation**: Docker-first approach with automatic dependency management

<!-- Template for future entries:

## [Unreleased]

### Added
### Changed  
### Deprecated
### Removed
### Fixed
### Security

-->
