"""Human-readable Coach game titles (players, POV, speed + clock)."""

from __future__ import annotations

from modules.game_import.metadata import resolve_display_speed_class

_SPEED_TITLES = {
    "ultrabullet": "UltraBullet",
    "bullet": "Bullet",
    "blitz": "Blitz",
    "rapid": "Rapid",
    "classical": "Classical",
    "daily": "Correspondencia",
    "correspondence": "Correspondencia",
}

_SECONDS_PER_DAY = 86_400
_DAILY_SPEED = frozenset({"daily", "correspondence"})


def format_clock_label(initial_seconds: int, increment: int) -> str:
    """Lichess / Chess.com UI style: 15+10, 8+2, 45+15."""
    inc = max(0, increment)
    if initial_seconds % 60 == 0:
        return f"{initial_seconds // 60}+{inc}"
    return f"{initial_seconds}s+{inc}"


def format_correspondence_days(period_seconds: int) -> str:
    """Chess.com / Lichess daily PGN: ``1/259200`` → ``3 días``."""
    days = period_seconds / _SECONDS_PER_DAY
    whole = int(round(days))
    if whole < 1:
        whole = 1
    return "1 día" if whole == 1 else f"{whole} días"


def _try_correspondence_slash_time_control(
    tc: str,
    *,
    daily_speed: bool = False,
) -> str | None:
    """``moves/periodSeconds`` with one move per period (daily / correspondence)."""
    if "/" not in tc:
        return None
    moves_part, _, period_part = tc.partition("/")
    period_base, _, _inc_tail = period_part.partition("+")
    try:
        moves = int(moves_part.strip())
        period = int(period_base.strip())
    except ValueError:
        return None
    if period < _SECONDS_PER_DAY:
        return None
    if moves != 1 and not daily_speed:
        return None
    return format_correspondence_days(period)


def format_time_control_display(
    raw: str | None,
    *,
    speed_class: str | None = None,
) -> str | None:
    """Turn PGN ``TimeControl`` (seconds) into ``15+10`` or ``3 días`` when possible."""
    tc = (raw or "").strip()
    if not tc or tc in {"-", "*"}:
        return None
    if tc.startswith("-"):
        return None
    daily_speed = (speed_class or "").strip().lower() in _DAILY_SPEED
    correspondence = _try_correspondence_slash_time_control(
        tc,
        daily_speed=daily_speed,
    )
    if correspondence:
        return correspondence
    if daily_speed and "/" in tc:
        return None
    if "+" in tc:
        left, _, right = tc.partition("+")
        base = left.split("/")[0]
        try:
            initial = int(base)
            increment = int(right) if right else 0
        except ValueError:
            return tc
        if daily_speed and initial < _SECONDS_PER_DAY:
            return None
        return format_clock_label(initial, increment)
    base = tc.split("/")[0]
    try:
        initial = int(base)
    except ValueError:
        return tc
    if daily_speed and initial < _SECONDS_PER_DAY:
        return None
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
    Correspondence: ``cmess4401 vs Rival · POV cmess4401 (Correspondencia 3 días)``.
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
    display_speed = resolve_display_speed_class(speed_class, time_control)
    speed_title = speed_class_title(display_speed)
    clock = format_time_control_display(time_control, speed_class=display_speed or speed_class)
    if speed_title:
        rhythm.append(speed_title)
    if clock:
        rhythm.append(clock)
    if rhythm:
        line += f" ({' '.join(rhythm)})"
    return line
