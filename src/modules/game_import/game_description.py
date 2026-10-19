"""Human-readable Coach game titles (players, POV, speed + clock)."""

from __future__ import annotations

_SPEED_TITLES = {
    "bullet": "Bullet",
    "blitz": "Blitz",
    "rapid": "Rapid",
    "classical": "Classical",
    "daily": "Correspondencia",
}


def format_clock_label(initial_seconds: int, increment: int) -> str:
    """Lichess / Chess.com UI style: 15+10, 8+2, 45+15."""
    inc = max(0, increment)
    if initial_seconds % 60 == 0:
        return f"{initial_seconds // 60}+{inc}"
    return f"{initial_seconds}s+{inc}"


def format_time_control_display(raw: str | None) -> str | None:
    """Turn PGN ``TimeControl`` (seconds) into ``15+10`` when possible."""
    tc = (raw or "").strip()
    if not tc or tc in {"-", "*"}:
        return None
    if tc.startswith("-"):
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
) -> str:
    """
    Example: ``Frontallappen vs cmess1315 · POV cmess1315 (Rapid 15+10)``.
    """
    white = (white_player or "").strip() or "Blancas"
    black = (black_player or "").strip() or "Negras"
    line = f"{white} vs {black}"
    pov = (player_username or "").strip()
    if pov:
        line += f" · POV {pov}"
    rhythm: list[str] = []
    speed_title = speed_class_title(speed_class)
    clock = format_time_control_display(time_control)
    if speed_title:
        rhythm.append(speed_title)
    if clock:
        rhythm.append(clock)
    if rhythm:
        line += f" ({' '.join(rhythm)})"
    return line
