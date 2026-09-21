"""LS01-004 — tool-owned SQLite schema; unique project game_id."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

DEFAULT_DB_PATH = Path("data") / "chess_statistics.sqlite"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS games (
    game_id TEXT PRIMARY KEY,
    lichess_id TEXT,
    fecha TEXT,
    usuario TEXT,
    color TEXT,
    rival TEXT,
    resultado TEXT,
    ritmo TEXT,
    perf TEXT,
    duracion_segundos INTEGER,
    ranking_inicial INTEGER,
    variacion_ranking INTEGER,
    ranking_final INTEGER,
    apertura TEXT,
    eco TEXT,
    cantidad_jugadas INTEGER,
    pgn TEXT,
    fecha_analisis TEXT,
    fuente_evaluacion TEXT,
    version_stockfish TEXT,
    profundidad_stockfish INTEGER,
    source_platform TEXT,
    source_url TEXT,
    external_game_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_games_lichess_id
    ON games (lichess_id)
    WHERE lichess_id IS NOT NULL AND lichess_id != '';

CREATE UNIQUE INDEX IF NOT EXISTS ux_games_source_external
    ON games (source_platform, external_game_id)
    WHERE external_game_id IS NOT NULL AND external_game_id != '';

CREATE TABLE IF NOT EXISTS evals (
    game_id TEXT NOT NULL,
    ply INTEGER NOT NULL,
    fen TEXT,
    move_uci TEXT,
    move_san TEXT,
    evaluation_before_cp INTEGER,
    evaluation_after_cp INTEGER,
    best_move TEXT,
    cp_loss INTEGER,
    win_probability_before REAL,
    win_probability_after REAL,
    move_accuracy REAL,
    judgment TEXT,
    phase TEXT,
    PRIMARY KEY (game_id, ply),
    FOREIGN KEY (game_id) REFERENCES games (game_id)
);

CREATE TABLE IF NOT EXISTS stats (
    game_id TEXT PRIMARY KEY,
    usuario TEXT,
    imprecisiones INTEGER,
    errores INTEGER,
    errores_graves INTEGER,
    perdida_promedio_cp REAL,
    precision_general REAL,
    precision_apertura REAL,
    precision_medio_juego REAL,
    precision_final REAL,
    FOREIGN KEY (game_id) REFERENCES games (game_id)
);
"""


def sqlite_path_from_url(database: str | Path) -> Path:
    """Resolve ``sqlite:///…`` URLs or filesystem paths to a Path."""
    if isinstance(database, Path):
        return database
    text = str(database).strip()
    if text.startswith("sqlite:"):
        parsed = urlparse(text)
        if parsed.scheme != "sqlite":
            raise ValueError(f"Unsupported database URL: {database!r}")
        raw = unquote(parsed.path or "")
        if parsed.netloc and parsed.netloc not in {".", ""}:
            raw = f"/{parsed.netloc}{raw}"
        if raw in {"/:memory:", ":memory:"}:
            raise ValueError("in-memory SQLite is not used by this tool")
        # SQLAlchemy-style: sqlite:///relative  sqlite:////abs  sqlite:///C:/abs
        if len(raw) >= 3 and raw[0] == "/" and raw[2] == ":":
            raw = raw[1:]
        elif raw.startswith("//"):
            raw = raw[1:]
        elif raw.startswith("/"):
            raw = raw[1:]
        if not raw:
            raise ValueError(f"SQLite URL has no path: {database!r}")
        return Path(raw)
    return Path(text)


def connect(database: str | Path = DEFAULT_DB_PATH) -> sqlite3.Connection:
    path = sqlite_path_from_url(database)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_SQL)
    columns = {row[1] for row in conn.execute("PRAGMA table_info(games)")}
    if "perf" not in columns:
        conn.execute("ALTER TABLE games ADD COLUMN perf TEXT")
    if "source_platform" not in columns:
        conn.execute("ALTER TABLE games ADD COLUMN source_platform TEXT")
    if "source_url" not in columns:
        conn.execute("ALTER TABLE games ADD COLUMN source_url TEXT")
    if "external_game_id" not in columns:
        conn.execute("ALTER TABLE games ADD COLUMN external_game_id TEXT")
    conn.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_games_source_external
        ON games (source_platform, external_game_id)
        WHERE external_game_id IS NOT NULL AND external_game_id != ''
        """
    )
    conn.commit()


@dataclass(frozen=True)
class InsertResult:
    inserted: bool
    game_id: str


class StatisticsRepository:
    """SQL for the Lichess statistics SQLite file (not product Postgres)."""

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def insert_game(
        self,
        game_id: str,
        *,
        lichess_id: str | None = None,
        pgn: str | None = None,
        **fields: Any,
    ) -> InsertResult:
        """Insert a games row. Same ``game_id`` is a no-op (not an update)."""
        if not game_id:
            raise ValueError("game_id is required")
        columns = {"game_id": game_id, "lichess_id": lichess_id, "pgn": pgn}
        allowed = {
            "fecha",
            "usuario",
            "color",
            "rival",
            "resultado",
            "ritmo",
            "perf",
            "duracion_segundos",
            "ranking_inicial",
            "variacion_ranking",
            "ranking_final",
            "apertura",
            "eco",
            "cantidad_jugadas",
            "fecha_analisis",
            "fuente_evaluacion",
            "version_stockfish",
            "profundidad_stockfish",
            "source_platform",
            "source_url",
            "external_game_id",
        }
        extra = {key: value for key, value in fields.items() if key in allowed}
        columns.update(extra)
        names = list(columns.keys())
        placeholders = ", ".join("?" for _ in names)
        col_sql = ", ".join(names)
        cur = self._conn.execute(
            f"INSERT OR IGNORE INTO games ({col_sql}) VALUES ({placeholders})",
            [columns[name] for name in names],
        )
        self._conn.commit()
        if cur.rowcount == 1:
            return InsertResult(inserted=True, game_id=game_id)
        existing = self.get_game(game_id)
        if existing is None and lichess_id:
            existing = self.get_game_by_lichess_id(lichess_id)
        if existing is None:
            platform = columns.get("source_platform")
            external = columns.get("external_game_id")
            if platform and external:
                existing = self.get_game_by_external(str(platform), str(external))
        if existing is None:
            return InsertResult(inserted=False, game_id=game_id)
        return InsertResult(inserted=False, game_id=str(existing["game_id"]))

    def update_game_fields(self, game_id: str, **fields: Any) -> None:
        allowed = {
            "lichess_id",
            "fecha",
            "usuario",
            "color",
            "rival",
            "resultado",
            "ritmo",
            "perf",
            "duracion_segundos",
            "ranking_inicial",
            "variacion_ranking",
            "ranking_final",
            "apertura",
            "eco",
            "cantidad_jugadas",
            "pgn",
            "source_platform",
            "source_url",
            "external_game_id",
        }
        extra = {key: value for key, value in fields.items() if key in allowed}
        if not extra:
            return
        assignments = ", ".join(f"{name} = ?" for name in extra)
        self._conn.execute(
            f"UPDATE games SET {assignments} WHERE game_id = ?",
            [*extra.values(), game_id],
        )
        self._conn.commit()

    def get_game(self, game_id: str) -> dict[str, Any] | None:
        row = self._conn.execute(
            "SELECT * FROM games WHERE game_id = ?",
            (game_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    def get_game_by_lichess_id(self, lichess_id: str) -> dict[str, Any] | None:
        row = self._conn.execute(
            "SELECT * FROM games WHERE lichess_id = ?",
            (lichess_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    def get_game_by_external(self, platform: str, external_id: str) -> dict[str, Any] | None:
        row = self._conn.execute(
            "SELECT * FROM games WHERE source_platform = ? AND external_game_id = ?",
            (platform, external_id),
        ).fetchone()
        return dict(row) if row is not None else None

    def list_games(
        self,
        *,
        usuario: str | None = None,
        since: str | None = None,
        until: str | None = None,
        ritmo: str | None = None,
        lichess_id: str | None = None,
        game_id: str | None = None,
        only_missing: bool = False,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        clauses = ["SELECT * FROM games g WHERE 1=1"]
        params: list[Any] = []
        if usuario:
            clauses.append("AND LOWER(g.usuario) = LOWER(?)")
            params.append(usuario)
        if since:
            clauses.append("AND g.fecha >= ?")
            params.append(since)
        if until:
            clauses.append("AND g.fecha <= ?")
            params.append(until)
        if ritmo:
            clauses.append(
                "AND (g.perf = ? OR (g.perf IS NULL AND g.ritmo = ?))"
            )
            params.extend([ritmo, ritmo])
        if lichess_id:
            clauses.append("AND g.lichess_id = ?")
            params.append(lichess_id)
        if game_id:
            clauses.append("AND g.game_id = ?")
            params.append(game_id)
        if only_missing:
            clauses.append(
                """
                AND (
                    g.fuente_evaluacion IS NULL
                    OR g.fuente_evaluacion = ''
                    OR NOT EXISTS (SELECT 1 FROM evals e WHERE e.game_id = g.game_id)
                )
                """
            )
        clauses.append("ORDER BY g.fecha ASC, g.lichess_id ASC")
        if limit is not None:
            clauses.append("LIMIT ?")
            params.append(int(limit))
        rows = self._conn.execute("\n".join(clauses), params).fetchall()
        return [dict(row) for row in rows]

    def insert_eval(self, game_id: str, ply: int, **fields: Any) -> bool:
        allowed = {
            "fen",
            "move_uci",
            "move_san",
            "evaluation_before_cp",
            "evaluation_after_cp",
            "best_move",
            "cp_loss",
            "win_probability_before",
            "win_probability_after",
            "move_accuracy",
            "judgment",
            "phase",
        }
        columns: dict[str, Any] = {"game_id": game_id, "ply": ply}
        columns.update({key: value for key, value in fields.items() if key in allowed})
        names = list(columns.keys())
        placeholders = ", ".join("?" for _ in names)
        cur = self._conn.execute(
            f"INSERT OR IGNORE INTO evals ({', '.join(names)}) VALUES ({placeholders})",
            [columns[name] for name in names],
        )
        self._conn.commit()
        return cur.rowcount == 1

    def list_evals(self, game_id: str) -> list[dict[str, Any]]:
        rows = self._conn.execute(
            "SELECT * FROM evals WHERE game_id = ? ORDER BY ply ASC",
            (game_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def delete_evals(self, game_id: str) -> None:
        self._conn.execute("DELETE FROM evals WHERE game_id = ?", (game_id,))
        self._conn.commit()

    def set_game_analysis_meta(
        self,
        game_id: str,
        *,
        fuente_evaluacion: str,
        fecha_analisis: str | None = None,
        version_stockfish: str | None = None,
        profundidad_stockfish: int | None = None,
    ) -> None:
        self._conn.execute(
            """
            UPDATE games
            SET fuente_evaluacion = ?,
                fecha_analisis = ?,
                version_stockfish = ?,
                profundidad_stockfish = ?
            WHERE game_id = ?
            """,
            (
                fuente_evaluacion,
                fecha_analisis,
                version_stockfish,
                profundidad_stockfish,
                game_id,
            ),
        )
        self._conn.commit()

    def insert_stats(self, game_id: str, **fields: Any) -> bool:
        allowed = {
            "usuario",
            "imprecisiones",
            "errores",
            "errores_graves",
            "perdida_promedio_cp",
            "precision_general",
            "precision_apertura",
            "precision_medio_juego",
            "precision_final",
        }
        columns: dict[str, Any] = {"game_id": game_id}
        columns.update({key: value for key, value in fields.items() if key in allowed})
        names = list(columns.keys())
        placeholders = ", ".join("?" for _ in names)
        cur = self._conn.execute(
            f"INSERT OR IGNORE INTO stats ({', '.join(names)}) VALUES ({placeholders})",
            [columns[name] for name in names],
        )
        self._conn.commit()
        return cur.rowcount == 1

    def get_stats(self, game_id: str) -> dict[str, Any] | None:
        row = self._conn.execute(
            "SELECT * FROM stats WHERE game_id = ?",
            (game_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    def upsert_stats(self, game_id: str, **fields: Any) -> None:
        if self.get_stats(game_id) is None:
            self.insert_stats(game_id, **fields)
            return
        allowed = {
            "usuario",
            "imprecisiones",
            "errores",
            "errores_graves",
            "perdida_promedio_cp",
            "precision_general",
            "precision_apertura",
            "precision_medio_juego",
            "precision_final",
        }
        extra = {key: value for key, value in fields.items() if key in allowed}
        if not extra:
            return
        assignments = ", ".join(f"{name} = ?" for name in extra)
        self._conn.execute(
            f"UPDATE stats SET {assignments} WHERE game_id = ?",
            [*extra.values(), game_id],
        )
        self._conn.commit()

    def set_eval_move_accuracy(self, game_id: str, ply: int, move_accuracy: float) -> None:
        self._conn.execute(
            "UPDATE evals SET move_accuracy = ? WHERE game_id = ? AND ply = ?",
            (move_accuracy, game_id, ply),
        )
        self._conn.commit()

    def set_eval_phase(self, game_id: str, ply: int, phase: str) -> None:
        self._conn.execute(
            "UPDATE evals SET phase = ? WHERE game_id = ? AND ply = ?",
            (phase, game_id, ply),
        )
        self._conn.commit()

    def set_eval_judgment(self, game_id: str, ply: int, judgment: str | None) -> None:
        self._conn.execute(
            "UPDATE evals SET judgment = ? WHERE game_id = ? AND ply = ?",
            (judgment, game_id, ply),
        )
        self._conn.commit()

    def list_games_with_stats(
        self,
        *,
        usuario: str | None = None,
        since: str | None = None,
        until: str | None = None,
        ritmo: str | None = None,
        color: str | None = None,
    ) -> list[dict[str, Any]]:
        sql = """
            SELECT
                g.game_id,
                g.lichess_id,
                g.source_url,
                g.source_platform,
                g.fecha,
                g.usuario,
                g.color,
                g.rival,
                g.resultado,
                g.ritmo,
                g.perf,
                g.duracion_segundos,
                g.ranking_inicial,
                g.ranking_final,
                g.apertura,
                g.eco,
                s.imprecisiones,
                s.errores,
                s.errores_graves,
                s.perdida_promedio_cp,
                s.precision_general,
                s.precision_apertura,
                s.precision_medio_juego,
                s.precision_final
            FROM games g
            LEFT JOIN stats s ON s.game_id = g.game_id
            WHERE 1=1
            """
        params: list[Any] = []
        if usuario:
            sql += " AND LOWER(g.usuario) = LOWER(?)"
            params.append(usuario)
        if since:
            sql += " AND g.fecha >= ?"
            params.append(since)
        if until:
            sql += " AND g.fecha <= ?"
            params.append(until)
        if ritmo:
            sql += " AND (g.perf = ? OR (g.perf IS NULL AND g.ritmo = ?))"
            params.extend([ritmo, ritmo])
        if color:
            sql += " AND g.color = ?"
            params.append(color)
        sql += " ORDER BY g.fecha ASC, g.lichess_id ASC"
        rows = self._conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]
