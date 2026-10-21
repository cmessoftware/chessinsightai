"""Human-readable Coach game titles (players, POV, speed + clock)."""

from __future__ import annotations

_SPEED_TITLES = {
    "bullet": "Bullet",
    "blitz": "Blitz",
    "rapid": "Rapid",
    "classical": "Classical",
    "daily": "Correspondencia",
    "correspondence": "Correspondencia",
}

_CORRESPONDENCE = frozenset({"daily", "correspondence"})
_DAY_PERIODS = frozenset({86400, 172800, 259200, 432000, 604800})


def format_clock_label(initial_seconds: int, increment: int) -> str:
    """Lichess / Chess.com UI style: 15+10, 8+2, 45+15."""
    inc = max(0, increment)
    if initial_seconds % 60 == 0:
        return f"{initial_seconds // 60}+{inc}"
    return f"{initial_seconds}s+{inc}"


def _days_label(days: int) -> str:
    return f"{days}d"


def format_time_control_display(
    raw: str | None,
    speed_class: str | None = None,
) -> str | None:
    """Turn PGN ``TimeControl`` into ``15+10`` or correspondence ``1d``."""
    key = (speed_class or "").strip().lower()
    tc = (raw or "").strip()
    if not tc or tc in {"-", "*"}:
        return None
    if tc.startswith("-"):
        return None

    if "/" in tc:
        days_s, _, period_s = tc.partition("/")
        period_s = period_s.split("+")[0]
        try:
            days = int(days_s)
            period = int(period_s)
        except ValueError:
            days = None
            period = None
        if days is not None and period in _DAY_PERIODS:
            return _days_label(days)

    if key in _CORRESPONDENCE:
        if "+" in tc:
            return None
        base = tc.split("/")[0]
        try:
            value = int(base)
        except ValueError:
            return None
        if value >= 86400 and value % 86400 == 0:
            return _days_label(value // 86400)
        if 1 <= value < 60:
            return _days_label(value)
        return None

    if "+" in tc:
        left, _, right = tc.partition("+")
        base = left.split("/")[0]
        try:
            initial = int(base)
            increment = int(right) if right else 0
        except ValueError:
            return tc
        return format_clock_label(initial, increment)
    base = tc.split("/")[0]
    try:
        initial = int(base)
    except ValueError:
        return tc
    return format_clock_label(initial, 0)


def speed_class_title(speed_class: str | None) -> str | None:
    key = (speed_class or "").strip().lower()
    if not key or key == "unknown":
        return None
    return _SPEED_TITLES.get(key, key.capitalize())


def format_coach_game_description(
    *,
    white_player: str,
    black_player: str,
    player_username: str | None = None,
    speed_class: str | None = None,
    time_control: str | None = None,
    display_title: str | None = None,
) -> str:
    """
    Example: ``Frontallappen vs cmess1315 · POV cmess1315 (Rapid 15+10)``.
    Correspondence: ``cmess4401 vs Rival · POV cmess4401 (Correspondencia 1d)``.
    """
    custom = (display_title or "").strip()
    if custom:
        line = custom
    else:
        white = (white_player or "").strip() or "Blancas"
        black = (black_player or "").strip() or "Negras"
        line = f"{white} vs {black}"
    pov = (player_username or "").strip()
    if pov:
        line += f" · POV {pov}"
    rhythm: list[str] = []
    speed_title = speed_class_title(speed_class)
    clock = format_time_control_display(time_control, speed_class)
    if speed_title:
        rhythm.append(speed_title)
    if clock:
        rhythm.append(clock)
    if rhythm:
        line += f" ({' '.join(rhythm)})"
    return line
