"""LS01-008 / LS01-009 — Lichess win% and AccuracyPercent.

WinPercent (008): clamp cp ±1000; k=-0.00368208; mate → ±1000; initial 15 cp.

AccuracyPercent (009, lila AccuracyPercent.scala):
- per-move: exp fit on win% drop + 1 uncertainty bonus, clamped 0–100
- game: mean of volatility-weighted mean and harmonic mean
- overall is **not** the mean of opening/middle/end (those are LS01-010)

Rounding vs Scala: Python float vs JVM Double; stdev is population (divide by n).
Documented golden tolerance vs Lichess UI: ±1.0 on ``precision_general``.
"""

from __future__ import annotations

import math
from typing import Any

CP_CEILING = 1000
CP_INITIAL = 15
WINNING_CHANCES_K = -0.00368208  # https://github.com/lichess-org/lila/pull/11148


def _user_is_white(user_color: str) -> bool:
    return user_color.strip().upper() in {"WHITE", "W"}


def winning_chances(cp: int) -> float:
    """White-POV winning chances in [-1, 1] after the Lichess cp ceiling."""
    ceiled = max(-CP_CEILING, min(CP_CEILING, int(cp)))
    raw = 2.0 / (1.0 + math.exp(WINNING_CHANCES_K * ceiled)) - 1.0
    return max(-1.0, min(1.0, raw))


def win_percent_from_cp(cp: int) -> float:
    """Win probability in [0, 100] for the side the cp is scored for."""
    return 50.0 + 50.0 * winning_chances(cp)


def win_percent_from_mate(mate: int) -> float:
    """Mate in N maps to ±1000 cp; distance is ignored (same as Lichess)."""
    if mate > 0:
        return win_percent_from_cp(CP_CEILING)
    if mate < 0:
        return win_percent_from_cp(-CP_CEILING)
    return win_percent_from_cp(0)


def win_percent_from_score(*, cp: int | None, mate: int | None) -> float | None:
    if mate is not None:
        return win_percent_from_mate(int(mate))
    if cp is not None:
        return win_percent_from_cp(int(cp))
    return None


def invert_score(
    cp: int | None, mate: int | None
) -> tuple[int | None, int | None]:
    return (
        None if cp is None else -int(cp),
        None if mate is None else -int(mate),
    )


def to_user_pov(
    white_cp: int | None,
    white_mate: int | None,
    user_color: str,
) -> tuple[int | None, int | None]:
    """Flip White-POV engine scores into the analyzed user's POV."""
    if _user_is_white(user_color):
        return white_cp, white_mate
    return invert_score(white_cp, white_mate)


def win_percent_user_pov(
    white_cp: int | None,
    white_mate: int | None,
    user_color: str,
    *,
    use_initial_if_missing: bool = False,
) -> float | None:
    cp, mate = white_cp, white_mate
    if cp is None and mate is None:
        if not use_initial_if_missing:
            return None
        cp, mate = CP_INITIAL, None
    user_cp, user_mate = to_user_pov(cp, mate, user_color)
    return win_percent_from_score(cp=user_cp, mate=user_mate)


def is_user_move_ply(ply: int, user_color: str) -> bool:
    """True when this 1-based ply was played by the analyzed user."""
    if _user_is_white(user_color):
        return ply % 2 == 1
    return ply % 2 == 0


# --- LS01-009 AccuracyPercent (lila AccuracyPercent.scala) ---

ACCURACY_A = 103.1668100711649
ACCURACY_K = 0.04354415386753951
ACCURACY_B = -3.166924740191411


def force_as_cp(cp: int | None, mate: int | None) -> int | None:
    """Lichess ``Eval.forceAsCp``: mate becomes ±1000, else the cp."""
    if mate is not None:
        if mate > 0:
            return CP_CEILING
        if mate < 0:
            return -CP_CEILING
        return 0
    if cp is None:
        return None
    return int(cp)


def accuracy_from_win_percents(before: float, after: float) -> float:
    """Per-move AccuracyPercent from two win probabilities (user POV)."""
    if after >= before:
        return 100.0
    win_diff = before - after
    raw = ACCURACY_A * math.exp(-ACCURACY_K * win_diff) + ACCURACY_B
    return max(0.0, min(100.0, raw + 1.0))  # +1 uncertainty bonus


def _squeeze(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _mean(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _population_stdev(values: list[float]) -> float | None:
    """scalalib ``Maths.standardDeviation``-style population stdev."""
    if not values:
        return None
    mean = _mean(values)
    if mean is None:
        return None
    return math.sqrt(sum((item - mean) ** 2 for item in values) / len(values))


def _weighted_mean(pairs: list[tuple[float, float]]) -> float | None:
    if not pairs:
        return None
    weight_sum = sum(weight for _, weight in pairs)
    if weight_sum == 0:
        return None
    return sum(value * weight for value, weight in pairs) / weight_sum


def _harmonic_mean(values: list[float]) -> float | None:
    if not values:
        return None
    if any(item <= 0 for item in values):
        return 0.0
    return len(values) / sum(1.0 / item for item in values)


def _sliding(items: list, size: int) -> list[list]:
    if size <= 0 or size > len(items):
        return []
    return [items[index : index + size] for index in range(len(items) - size + 1)]


def per_move_accuracies(
    ply_cps: list[int | None],
    *,
    start_white: bool = True,
) -> list[tuple[bool, float] | None]:
    """One entry per ply: (is_white_move, accuracy) or None if not computable.

    ``ply_cps`` are White-POV cps after each ply (Lichess ``forceAsCp``).
    """
    all_wp: list[float | None] = [win_percent_from_cp(CP_INITIAL)]
    all_wp.extend(None if cp is None else win_percent_from_cp(cp) for cp in ply_cps)
    if len(all_wp) < 2:
        return []
    window_size = int(_squeeze(len(ply_cps) // 10, 2, 8))
    first_window = all_wp[:window_size]
    pad = max(0, min(window_size, len(all_wp)) - 2)
    windows = [first_window] * pad + _sliding(all_wp, window_size)
    weights: list[float | None] = []
    for window in windows:
        if any(item is None for item in window):
            weights.append(None)
            continue
        stdev = _population_stdev([float(item) for item in window])
        if stdev is None:
            weights.append(None)
        else:
            weights.append(_squeeze(stdev, 0.5, 12.0))
    pairs = _sliding(all_wp, 2)
    result: list[tuple[bool, float] | None] = []
    for index, pair in enumerate(pairs):
        prev, nxt = pair
        weight = weights[index] if index < len(weights) else None
        is_white_move = (index % 2 == 0) == start_white
        if prev is None or nxt is None or weight is None:
            result.append(None)
            continue
        if is_white_move:
            accuracy = accuracy_from_win_percents(prev, nxt)
        else:
            accuracy = accuracy_from_win_percents(nxt, prev)
        result.append((is_white_move, accuracy))
    return result


def game_accuracy_percent(
    ply_cps: list[int | None],
    user_color: str,
    *,
    start_white: bool = True,
    initial_cp: int = CP_INITIAL,
) -> float | None:
    """Volatility-weighted mean averaged with harmonic mean (not mean of phases)."""
    return _combine_user_accuracy(
        ply_cps,
        _user_is_white(user_color),
        start_white=start_white,
        initial_cp=initial_cp,
    )


def _combine_user_accuracy(
    ply_cps: list[int | None],
    user_white: bool,
    *,
    start_white: bool,
    initial_cp: int = CP_INITIAL,
) -> float | None:
    all_wp: list[float | None] = [win_percent_from_cp(initial_cp)]
    all_wp.extend(None if cp is None else win_percent_from_cp(cp) for cp in ply_cps)
    window_size = int(_squeeze(len(ply_cps) // 10, 2, 8))
    pad = max(0, min(window_size, len(all_wp)) - 2)
    windows = [all_wp[:window_size]] * pad + _sliding(all_wp, window_size)
    weights: list[float | None] = []
    for window in windows:
        if any(item is None for item in window):
            weights.append(None)
            continue
        stdev = _population_stdev([float(item) for item in window])
        weights.append(None if stdev is None else _squeeze(stdev, 0.5, 12.0))
    weighted_pairs: list[tuple[float, float]] = []
    harmonic_values: list[float] = []
    for index, pair in enumerate(_sliding(all_wp, 2)):
        prev, nxt = pair
        weight = weights[index] if index < len(weights) else None
        is_white_move = (index % 2 == 0) == start_white
        if is_white_move != user_white or prev is None or nxt is None or weight is None:
            continue
        if is_white_move:
            accuracy = accuracy_from_win_percents(prev, nxt)
        else:
            accuracy = accuracy_from_win_percents(nxt, prev)
        weighted_pairs.append((accuracy, weight))
        harmonic_values.append(accuracy)
    weighted = _weighted_mean(weighted_pairs)
    harmonic = _harmonic_mean(harmonic_values)
    if weighted is None or harmonic is None:
        return None
    return (weighted + harmonic) / 2.0


def persist_user_accuracy(
    repo: Any,
    game_id: str,
    user_color: str,
    ply_cps: list[int | None],
) -> float | None:
    """Write ``move_accuracy`` on evals and ``precision_general`` on stats."""
    per_move = per_move_accuracies(ply_cps)
    user_white = _user_is_white(user_color)
    for index, item in enumerate(per_move):
        if item is None:
            continue
        is_white_move, accuracy = item
        if is_white_move != user_white:
            continue
        repo.set_eval_move_accuracy(game_id, index + 1, accuracy)
    precision = game_accuracy_percent(ply_cps, user_color)
    game = repo.get_game(game_id)
    usuario = game.get("usuario") if game else None
    if precision is not None:
        repo.upsert_stats(game_id, usuario=usuario, precision_general=precision)
    return precision


# --- LS01-011 Lichess Insight judgments (Advice.scala winning-chance bands) ---

JUDGMENT_INACCURACY = "Inaccuracy"
JUDGMENT_MISTAKE = "Mistake"
JUDGMENT_BLUNDER = "Blunder"
WC_INACCURACY = 0.10
WC_MISTAKE = 0.20
WC_BLUNDER = 0.30


def judgment_from_wc_drop(drop: float) -> str | None:
    """Drop is the mover's loss in winningChances [-1, 1]: ≥0.30 blunder, ≥0.20 mistake, ≥0.10 inaccuracy."""
    if drop >= WC_BLUNDER:
        return JUDGMENT_BLUNDER
    if drop >= WC_MISTAKE:
        return JUDGMENT_MISTAKE
    if drop >= WC_INACCURACY:
        return JUDGMENT_INACCURACY
    return None


def mover_wc_drop(before_white_cp: int, after_white_cp: int, ply: int) -> float:
    """White-POV cps; fold by side to move (lila ``info.color.fold(-d, d)``)."""
    before = winning_chances(before_white_cp)
    after = winning_chances(after_white_cp)
    delta = after - before
    if ply % 2 == 1:
        return -delta
    return delta


def persist_judgments(
    repo: Any,
    game_id: str,
    user_color: str,
    ply_cps: list[int | None],
) -> dict[str, Any]:
    """Annotate each ply and store user counts + mean cp loss (not ML ``error_label``)."""
    prev = CP_INITIAL
    inaccuracies = mistakes = blunders = 0
    user_losses: list[int] = []
    user_white = _user_is_white(user_color)
    for index, after_cp in enumerate(ply_cps):
        ply = index + 1
        if after_cp is None:
            continue
        drop = mover_wc_drop(prev, after_cp, ply)
        judgment = judgment_from_wc_drop(drop)
        repo.set_eval_judgment(game_id, ply, judgment)
        is_user = (ply % 2 == 1) == user_white
        if is_user:
            if judgment == JUDGMENT_INACCURACY:
                inaccuracies += 1
            elif judgment == JUDGMENT_MISTAKE:
                mistakes += 1
            elif judgment == JUDGMENT_BLUNDER:
                blunders += 1
            if ply % 2 == 1:
                user_losses.append(prev - after_cp)
            else:
                user_losses.append(after_cp - prev)
        prev = after_cp
    acpl = (sum(user_losses) / len(user_losses)) if user_losses else None
    game = repo.get_game(game_id)
    usuario = game.get("usuario") if game else None
    repo.upsert_stats(
        game_id,
        usuario=usuario,
        imprecisiones=inaccuracies,
        errores=mistakes,
        errores_graves=blunders,
        perdida_promedio_cp=acpl,
    )
    return {
        "imprecisiones": inaccuracies,
        "errores": mistakes,
        "errores_graves": blunders,
        "perdida_promedio_cp": acpl,
    }
