"""OpenSpec SPAR-01: variables de entorno Maia-3 / fallback Lc0+Maia-2."""

from __future__ import annotations

import os
import shlex
from dataclasses import dataclass
from typing import Literal

MaiaProvider = Literal["maia3", "lc0_maia2"]

DEFAULT_MAIA3_CMD = "maia3-5m"
DEFAULT_MAIA3_ELO = 1500
DEFAULT_MAIA3_DEVICE = "cpu"
DEFAULT_MOVE_TIMEOUT_SEC = 60.0


def _env_bool(name: str, default: bool = False) -> bool:
    raw = (os.environ.get(name) or "").strip().lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on")


def _env_int(name: str, default: int) -> int:
    raw = (os.environ.get(name) or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = (os.environ.get(name) or "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


@dataclass(frozen=True)
class MaiaSettings:
    """Configuración de motor humano para sparring (spec §4.6, SPAR-01)."""

    provider: MaiaProvider
    maia3_cmd: str
    maia3_model: str | None
    maia3_python: str | None
    maia3_module: str | None
    default_elo: int
    device: str
    use_uci_history: bool
    extra_args: tuple[str, ...]
    move_timeout_sec: float
    lc0_engine_path: str | None
    lc0_weights_dir: str | None

    def build_uci_argv(self) -> list[str]:
        """Argv para ``chess.engine.SimpleEngine.popen_uci`` (SPAR-03)."""
        if self.provider == "lc0_maia2":
            if not self.lc0_engine_path:
                raise ValueError("MAIA_ENGINE_PATH required for lc0_maia2")
            return [self.lc0_engine_path]

        if self.maia3_python and self.maia3_module:
            argv = [self.maia3_python, "-m", self.maia3_module]
            if self.maia3_model:
                argv.extend(["--model", f"maia3-{self.maia3_model}"])
            if self.device:
                argv.extend(["--device", self.device])
            if self.use_uci_history:
                argv.append("--use-uci-history")
            argv.extend(self.extra_args)
            return argv

        if self.maia3_cmd:
            return [self.maia3_cmd, *self.extra_args]

        raise ValueError("MAIA3_CMD or MAIA3_PYTHON+MAIA3_MODULE required for maia3")


def load_maia_settings() -> MaiaSettings:
    provider_raw = (os.environ.get("MAIA_PROVIDER") or "maia3").strip().lower()
    if provider_raw not in ("maia3", "lc0_maia2"):
        raise ValueError(f"unsupported MAIA_PROVIDER: {provider_raw!r}")

    extra_raw = (os.environ.get("MAIA3_EXTRA_ARGS") or "").strip()
    extra_args = tuple(shlex.split(extra_raw, posix=os.name != "nt")) if extra_raw else ()

    model = (os.environ.get("MAIA3_MODEL") or "").strip() or None

    return MaiaSettings(
        provider=provider_raw,  # type: ignore[arg-type]
        maia3_cmd=(os.environ.get("MAIA3_CMD") or DEFAULT_MAIA3_CMD).strip(),
        maia3_model=model,
        maia3_python=(os.environ.get("MAIA3_PYTHON") or "").strip() or None,
        maia3_module=(os.environ.get("MAIA3_MODULE") or "").strip() or None,
        default_elo=_env_int("MAIA3_DEFAULT_ELO", DEFAULT_MAIA3_ELO),
        device=(os.environ.get("MAIA3_DEVICE") or DEFAULT_MAIA3_DEVICE).strip(),
        use_uci_history=_env_bool("MAIA3_USE_UCI_HISTORY", True),
        extra_args=extra_args,
        move_timeout_sec=_env_float("MAIA_MOVE_TIMEOUT_SEC", DEFAULT_MOVE_TIMEOUT_SEC),
        lc0_engine_path=(os.environ.get("MAIA_ENGINE_PATH") or "").strip() or None,
        lc0_weights_dir=(os.environ.get("MAIA_WEIGHTS_DIR") or "").strip() or None,
    )
