"""RPT-FEAT-03: rating min, average and max per speed class, plus the dated series."""

from __future__ import annotations

from datetime import date

from modules.game_import.metadata import resolve_display_speed_class

SPEED_ORDER = (
    "ultrabullet",
    "bullet",
    "blitz",
    "rapid",
    "classical",
    "daily",
    "correspondence",
)

SPEED_LABELS = {
    "ultrabullet": "UltraBullet",
    "bullet": "Bullet",
    "blitz": "Blitz",
    "rapid": "Rapid",
    "classical": "Classical",
    "daily": "Correspondencia",
    "correspondence": "Correspondencia",
}


def parse_played_on(raw: str | None) -> date | None:
    text = (raw or "").strip()
    if len(text) < 10 or text[4] != "." or text[7] != ".":
        return None
    year, month, day = text[0:4], text[5:7], text[8:10]
    if "?" in year or "?" in month or "?" in day:
        return None
    try:
        return date(int(year), int(month), int(day))
    except ValueError:
        return None


def parse_elo(raw) -> int | None:
    text = str(raw or "").strip()
    if not text:
        return None
    try:
        value = int(text)
    except ValueError:
        return None
    if value <= 0:
        return None
    return value


def player_color(row: dict) -> str | None:
    color = str(row.get("player_color") or "").strip().lower()
    if color in {"white", "black"}:
        return color
    name = str(row.get("player_username") or "").strip().lower()
    if not name:
        return None
    if name == str(row.get("white_player") or "").strip().lower():
        return "white"
    if name == str(row.get("black_player") or "").strip().lower():
        return "black"
    return None


def player_elo(row: dict) -> int | None:
    color = player_color(row)
    if color == "white":
        return parse_elo(row.get("white_elo"))
    if color == "black":
        return parse_elo(row.get("black_elo"))
    return None


def window_start(today: date, months: int) -> date:
    month_index = today.month - 1 - months
    year = today.year + month_index // 12
    month = month_index % 12 + 1
    day = min(today.day, _days_in_month(year, month))
    return date(year, month, day)


def _days_in_month(year: int, month: int) -> int:
    if month == 12:
        nxt = date(year + 1, 1, 1)
    else:
        nxt = date(year, month + 1, 1)
    return (nxt - date(year, month, 1)).days


def summarize_ranking(rows: list[dict], *, today: date, months: int = 12) -> dict:
    start = window_start(today, months)
    grouped: dict[str, list[dict]] = {}
    players: set[str] = set()
    skipped = 0
    for row in rows:
        played = parse_played_on(row.get("date_played"))
        rating = player_elo(row)
        speed = resolve_display_speed_class(row.get("speed_class"), row.get("time_control"))
        if played is None or rating is None or not speed:
            skipped += 1
            continue
        if played < start or played > today:
            continue
        grouped.setdefault(speed, []).append({"date": played, "rating": rating})
        name = str(row.get("player_username") or "").strip()
        if name:
            players.add(name)

    rhythms = []
    for speed in _ordered_speeds(grouped):
        points = sorted(grouped[speed], key=lambda point: (point["date"], point["rating"]))
        average = sum(point["rating"] for point in points) / len(points)
        minimum = min(points, key=lambda point: (point["rating"], point["date"]))
        maximum = max(points, key=lambda point: (point["rating"], point["date"]))
        nearest = min(points, key=lambda point: (abs(point["rating"] - average), point["date"]))
        rhythms.append(
            {
                "speed_class": speed,
                "label": SPEED_LABELS.get(speed, speed[:1].upper() + speed[1:]),
                "games": len(points),
                "minimum": _extreme(minimum),
                "average": {"rating": round(average, 1), "date": nearest["date"].isoformat()},
                "maximum": _extreme(maximum),
                "series": [
                    {"date": point["date"].isoformat(), "rating": point["rating"]} for point in points
                ],
            }
        )
    return {
        "from": start.isoformat(),
        "to": today.isoformat(),
        "months": months,
        "skipped": skipped,
        "players": sorted(players),
        "rhythms": rhythms,
    }


def _extreme(point: dict) -> dict:
    return {"rating": point["rating"], "date": point["date"].isoformat()}


def _ordered_speeds(grouped: dict[str, list]) -> list[str]:
    known = [speed for speed in SPEED_ORDER if speed in grouped]
    extra = sorted(speed for speed in grouped if speed not in SPEED_ORDER)
    return known + extra


def catalog_names(rows: list[dict]) -> list[str]:
    found: dict[str, str] = {}
    for row in rows:
        for key in ("white_player", "black_player"):
            name = str(row.get(key) or "").strip()
            if name:
                found.setdefault(name.casefold(), name)
    return [found[key] for key in sorted(found)]


def _remember(catalog: dict[str, str], candidate: str | None) -> str | None:
    text = (candidate or "").strip()
    if not text:
        return None
    key = text.casefold()
    catalog.setdefault(key, text)
    return catalog[key]


def rows_for_player(rows: list[dict], player: str) -> list[dict]:
    target = player.casefold()
    selected = []
    for row in rows:
        white = str(row.get("white_player") or "").strip()
        black = str(row.get("black_player") or "").strip()
        if white.casefold() == target:
            color, name = "white", white
        elif black.casefold() == target:
            color, name = "black", black
        else:
            continue
        chosen = dict(row)
        chosen["player_color"] = color
        chosen["player_username"] = name
        selected.append(chosen)
    return selected


def build_ranking_report(
    rows: list[dict],
    *,
    today: date,
    months: int = 12,
    lichess_username: str | None = None,
    chesscom_username: str | None = None,
    player: str | None = None,
) -> dict:
    catalog = {name.casefold(): name for name in catalog_names(rows)}
    lichess_name = _remember(catalog, lichess_username)
    chesscom_name = _remember(catalog, chesscom_username)
    requested = _remember(catalog, player)
    ordered = [catalog[key] for key in sorted(catalog)]
    if requested:
        chosen = requested
    elif lichess_name:
        chosen = lichess_name
    elif chesscom_name:
        chosen = chesscom_name
    else:
        chosen = ordered[0] if ordered else ""
    filtered = rows_for_player(rows, chosen) if chosen else []
    summary = summarize_ranking(filtered, today=today, months=months)
    summary["players"] = ordered
    summary["player"] = chosen
    return summary


def load_ranking_rows(db, owner_user_id: int) -> list[dict]:
    from models.database_models import Games
    from models.module07_models import CoachGame

    query = (
        db.query(
            CoachGame.player_color,
            CoachGame.player_username,
            CoachGame.speed_class,
            Games.time_control,
            Games.date_played,
            Games.white_elo,
            Games.black_elo,
            Games.white_player,
            Games.black_player,
        )
        .join(Games, CoachGame.master_game_id == Games.game_id)
        .filter(CoachGame.owner_user_id == owner_user_id)
        .filter(CoachGame.corpus_type == "personal")
    )
    return [
        {
            "player_color": row.player_color,
            "player_username": row.player_username,
            "speed_class": row.speed_class,
            "time_control": row.time_control,
            "date_played": row.date_played,
            "white_elo": row.white_elo,
            "black_elo": row.black_elo,
            "white_player": row.white_player,
            "black_player": row.black_player,
        }
        for row in query.all()
    ]
