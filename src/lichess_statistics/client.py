"""LS01-001 — stream Lichess user games as NDJSON objects."""

from __future__ import annotations

import json
import logging
import os
import time
from collections.abc import Iterator
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import requests

logger = logging.getLogger(__name__)

LICHESS_GAMES_URL = "https://lichess.org/api/games/user/{username}"
DEFAULT_TIMEOUT_S = 60.0
DEFAULT_MAX_RETRIES = 4
RATE_LIMIT_WAIT_S = 60.0
USER_AGENT = "ChessInsightAI-lichess-statistics/0.1 (+https://github.com/cmessoftware/chessinsightai)"


class LichessClientError(RuntimeError):
    """HTTP or protocol error talking to Lichess (not a single bad NDJSON line)."""


def _to_millis(value: datetime | str | int | None, *, end_of_day: bool = False) -> int | None:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        text = value.strip()
        if text.isdigit():
            return int(text)
        parsed = datetime.strptime(text, "%Y-%m-%d")
        if end_of_day:
            parsed = parsed.replace(hour=23, minute=59, second=59, microsecond=999000)
        parsed = parsed.replace(tzinfo=timezone.utc)
        return int(parsed.timestamp() * 1000)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return int(value.timestamp() * 1000)


def lichess_token_from_env() -> str | None:
    """Prefer ``LICHESS_API_TOKEN`` (repo .env), then ``LICHESS_TOKEN``."""
    for key in ("LICHESS_API_TOKEN", "LICHESS_TOKEN"):
        value = (os.environ.get(key) or "").strip()
        if value:
            return value
    return None


class LichessClient:
    """Official export API client. Yields one JSON object per game (does not buffer the archive)."""

    def __init__(
        self,
        *,
        token: str | None = None,
        timeout_s: float = DEFAULT_TIMEOUT_S,
        max_retries: int = DEFAULT_MAX_RETRIES,
        rate_limit_wait_s: float = RATE_LIMIT_WAIT_S,
        session: requests.Session | None = None,
        sleep: Any = time.sleep,
    ) -> None:
        env_token = lichess_token_from_env()
        self._token = env_token if token is None else token
        self.timeout_s = timeout_s
        self.max_retries = max_retries
        self.rate_limit_wait_s = rate_limit_wait_s
        self._session = session or requests.Session()
        self._sleep = sleep

    def iter_user_games(
        self,
        username: str,
        *,
        since: datetime | str | int | None = None,
        until: datetime | str | int | None = None,
        perf_type: str | None = None,
        rated: bool | None = None,
        max_games: int | None = None,
        clocks: bool = True,
        evals: bool = True,
        opening: bool = True,
    ) -> Iterator[dict[str, Any]]:
        """Stream games from ``GET /api/games/user/{username}`` as NDJSON dicts."""
        name = (username or "").strip()
        if not name:
            raise ValueError("username is required")
        if max_games is not None and max_games < 1:
            raise ValueError("max_games must be >= 1")

        url = LICHESS_GAMES_URL.format(username=quote(name, safe=""))
        params: dict[str, Any] = {
            "pgnInJson": "true",
            "clocks": "true" if clocks else "false",
            "evals": "true" if evals else "false",
            "opening": "true" if opening else "false",
        }
        since_ms = _to_millis(since)
        until_ms = _to_millis(until, end_of_day=isinstance(until, str) and not str(until).strip().isdigit())
        if since_ms is not None:
            params["since"] = since_ms
        if until_ms is not None:
            params["until"] = until_ms
        if perf_type:
            params["perfType"] = perf_type
        if rated is not None:
            params["rated"] = "true" if rated else "false"
        if max_games is not None:
            params["max"] = int(max_games)

        yielded = 0
        response = self._get_with_retry(url, params)
        try:
            for raw in response.iter_lines():
                if not raw:
                    continue
                try:
                    game = json.loads(raw)
                except json.JSONDecodeError:
                    logger.warning("Skipping invalid NDJSON line (%s bytes)", len(raw))
                    continue
                if not isinstance(game, dict):
                    logger.warning("Skipping NDJSON line that is not an object")
                    continue
                yield game
                yielded += 1
                if max_games is not None and yielded >= max_games:
                    break
        finally:
            response.close()

    def _headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/x-ndjson",
            "User-Agent": USER_AGENT,
        }
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return headers

    def _get_with_retry(self, url: str, params: dict[str, Any]) -> requests.Response:
        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = self._session.get(
                    url,
                    params=params,
                    headers=self._headers(),
                    stream=True,
                    timeout=self.timeout_s,
                )
            except requests.RequestException as exc:
                last_error = exc
                logger.warning("Lichess request failed (attempt %s/%s)", attempt, self.max_retries)
                self._backoff(attempt)
                continue

            if response.status_code == 429:
                wait = self._retry_after_seconds(response)
                logger.warning("Lichess HTTP 429; waiting %ss", wait)
                response.close()
                self._sleep(wait)
                last_error = LichessClientError("HTTP 429 from Lichess")
                continue

            if 500 <= response.status_code < 600:
                last_error = LichessClientError(f"HTTP {response.status_code} from Lichess")
                logger.warning(
                    "Lichess HTTP %s (attempt %s/%s)",
                    response.status_code,
                    attempt,
                    self.max_retries,
                )
                response.close()
                self._backoff(attempt)
                continue

            if response.status_code != 200:
                body = ""
                try:
                    body = response.text[:200]
                except Exception:
                    body = ""
                response.close()
                raise LichessClientError(
                    f"Lichess HTTP {response.status_code}" + (f": {body}" if body else "")
                )
            return response

        raise LichessClientError(f"Lichess request failed after {self.max_retries} attempts") from last_error

    def _retry_after_seconds(self, response: requests.Response) -> float:
        header = response.headers.get("Retry-After")
        if header:
            try:
                return max(self.rate_limit_wait_s, float(header))
            except ValueError:
                pass
        return self.rate_limit_wait_s

    def _backoff(self, attempt: int) -> None:
        self._sleep(min(30.0, 2.0 ** attempt))
