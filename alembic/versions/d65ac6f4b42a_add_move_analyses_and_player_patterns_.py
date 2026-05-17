"""add_move_analyses_and_player_patterns_tables

Revision ID: d65ac6f4b42a
Revises: mlflow_postgres_migration
Create Date: 2026-03-26 12:36:25.274361

Migración para Arquitectura Orquestada - Fase 1
Crea tablas para análisis detallado de movimientos y patrones de jugadores
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd65ac6f4b42a'
down_revision: Union[str, None] = 'mlflow_postgres_migration'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Crea tablas move_analyses y player_patterns."""
    
    # ========================================
    # TABLA 1: move_analyses
    # Análisis detallado de cada movimiento con ML, RAG y Critic
    # ========================================
    op.create_table(
        'move_analyses',
        # Primary key
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        
        # Referencias
        sa.Column('game_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('ply', sa.Integer(), nullable=False),
        sa.Column('move_san', sa.String(10), nullable=False),
        
        # ===== Execution Result =====
        sa.Column('fen_before', sa.Text(), nullable=False),
        sa.Column('fen_after', sa.Text(), nullable=False),
        sa.Column('engine_eval_before', sa.Float(), nullable=True),
        sa.Column('engine_eval_after', sa.Float(), nullable=True),
        sa.Column('score_diff', sa.Float(), nullable=True),
        sa.Column('best_move', sa.String(10), nullable=True),
        sa.Column('best_line', postgresql.ARRAY(sa.Text()), nullable=True),
        
        # Features y tácticas (JSON)
        sa.Column('features', postgresql.JSONB(), nullable=True),
        sa.Column('tactical_tags', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('phase', sa.String(20), nullable=True),
        
        # ===== ML Prediction =====
        sa.Column('ml_predicted_error', sa.String(20), nullable=True),
        sa.Column('ml_confidence', sa.Float(), nullable=True),
        sa.Column('ml_risk_score', sa.Float(), nullable=True),
        sa.Column('ml_contributing_features', postgresql.JSONB(), nullable=True),
        
        # ===== RAG Context =====
        sa.Column('rag_similar_positions', postgresql.JSONB(), nullable=True),
        sa.Column('rag_book_excerpts', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('rag_total_retrieved', sa.Integer(), server_default='0'),
        sa.Column('rag_relevance_scores', postgresql.ARRAY(sa.Float()), nullable=True),
        
        # ===== Explanation =====
        sa.Column('explanation', sa.Text(), nullable=False),
        
        # ===== Critic Result =====
        sa.Column('is_consistent', sa.Boolean(), nullable=False),
        sa.Column('critic_confidence', sa.Float(), nullable=True),
        sa.Column('critic_issues', postgresql.JSONB(), nullable=True),
        sa.Column('critic_passed_rules', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('critic_failed_rules', postgresql.ARRAY(sa.Text()), nullable=True),
        
        # ===== Metadata =====
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('NOW()')),
        sa.Column('execution_time', sa.Float(), nullable=True),
        sa.Column('version', sa.String(20), server_default='v2.0'),
        
        # ===== Foreign Keys =====
        sa.ForeignKeyConstraint(['game_id'], ['games.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['player_id'], ['users.id']),
        
        # ===== Constraints =====
        sa.CheckConstraint('ml_confidence >= 0 AND ml_confidence <= 1', name='check_ml_confidence'),
        sa.CheckConstraint('ml_risk_score >= 0 AND ml_risk_score <= 1', name='check_ml_risk_score'),
        sa.CheckConstraint('critic_confidence >= 0 AND critic_confidence <= 1', name='check_critic_confidence'),
        sa.CheckConstraint('ply >= 0', name='check_ply_positive'),
        sa.UniqueConstraint('game_id', 'ply', 'version', name='uq_game_ply_version')
    )
    
    # ===== Indexes para move_analyses =====
    op.create_index('idx_game_ply', 'move_analyses', ['game_id', 'ply'])
    op.create_index('idx_player_created', 'move_analyses', ['player_id', 'created_at'], postgresql_ops={'created_at': 'DESC'})
    op.create_index('idx_version', 'move_analyses', ['version'])
    op.create_index('idx_ml_prediction', 'move_analyses', ['ml_predicted_error'])
    op.create_index('idx_critic_consistent', 'move_analyses', ['is_consistent'])
    
    # ========================================
    # TABLA 2: player_patterns
    # Patrones agregados y estadísticas por jugador
    # ========================================
    op.create_table(
        'player_patterns',
        # Primary key
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        
        # Referencia única por jugador
        sa.Column('player_id', sa.Integer(), nullable=False, unique=True),
        
        # ===== Estadísticas Agregadas =====
        sa.Column('total_games_analyzed', sa.Integer(), server_default='0'),
        sa.Column('total_moves_analyzed', sa.Integer(), server_default='0'),
        
        # Distribución de errores
        sa.Column('error_distribution', postgresql.JSONB(), nullable=True),
        
        # ===== Tácticas =====
        sa.Column('frequent_tactics', postgresql.JSONB(), nullable=True),
        
        # ===== Fases =====
        sa.Column('weak_phases', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('phase_error_rates', postgresql.JSONB(), nullable=True),
        
        # ===== Tendencias =====
        sa.Column('improvement_trend', sa.Float(), nullable=True),
        sa.Column('recent_avg_error_rate', sa.Float(), nullable=True),
        
        # ===== Clustering =====
        sa.Column('error_clusters', postgresql.JSONB(), nullable=True),
        
        # ===== Timestamps =====
        sa.Column('last_updated', sa.TIMESTAMP(), server_default=sa.text('NOW()')),
        
        # ===== Foreign Keys =====
        sa.ForeignKeyConstraint(['player_id'], ['users.id'], ondelete='CASCADE'),
        
        # ===== Constraints =====
        sa.CheckConstraint('improvement_trend >= -1 AND improvement_trend <= 1', name='check_improvement_trend'),
        sa.CheckConstraint('recent_avg_error_rate >= 0 AND recent_avg_error_rate <= 1', name='check_avg_error_rate')
    )
    
    # ===== Index para player_patterns =====
    op.create_index('idx_player_patterns_last_updated', 'player_patterns', ['last_updated'], postgresql_ops={'last_updated': 'DESC'})


def downgrade() -> None:
    """Downgrade schema - Elimina tablas move_analyses y player_patterns."""
    
    # Drop indexes
    op.drop_index('idx_player_patterns_last_updated', table_name='player_patterns')
    op.drop_index('idx_critic_consistent', table_name='move_analyses')
    op.drop_index('idx_ml_prediction', table_name='move_analyses')
    op.drop_index('idx_version', table_name='move_analyses')
    op.drop_index('idx_player_created', table_name='move_analyses')
    op.drop_index('idx_game_ply', table_name='move_analyses')
    
    # Drop tables (orden inverso por dependencias)
    op.drop_table('player_patterns')
    op.drop_table('move_analyses')
