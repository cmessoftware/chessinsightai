"""Tests for LS01-001 — Lichess NDJSON client (no live API)."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

import pytest

SRC = Path(__file__).resolve().parents[2] / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from chess_statistics.client import (  # noqa: E402
    LICHESS_GAMES_URL,
    LichessClient,
    LichessClientError,
    RATE_LIMIT_WAIT_S,
)

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "cmess4401_rapid_two_games.ndjson"


class _FakeResponse:
    def __init__(self, status_code: int, lines: list[bytes], headers: dict | None = None):
        self.status_code = status_code
        self.headers = headers or {}
        self._lines = lines
        self.closed = False
        self.text = ""

    def iter_lines(self):
        yield from self._lines

    def close(self):
        self.closed = True


def _fixture_lines() -> list[bytes]:
    return [line.encode("utf-8") for line in FIXTURE.read_text(encoding="utf-8").splitlines() if line.strip()]


def test_iter_user_games_streams_fixture_objects():
    session = MagicMock()
    session.get.return_value = _FakeResponse(200, _fixture_lines())
    client = LichessClient(session=session, token=None)
    games = list(client.iter_user_games("cmess4401", perf_type="rapid"))

    assert [g["id"] for g in games] == ["tOsxrK57", "ApzutTLl"]
    assert games[0]["players"]["black"]["user"]["name"] == "cmess4401"
    assert games[0]["pgn"].startswith("[Event")
    assert f"https://lichess.org/{games[0]['id']}" in games[0]["pgn"]
    assert "opening" in games[0]
    assert session.get.call_args.kwargs["stream"] is True
    params = session.get.call_args.kwargs["params"]
    assert params["evals"] == "true"
    assert params["clocks"] == "true"
    assert params["opening"] == "true"
    assert params["pgnInJson"] == "true"
    assert params["perfType"] == "rapid"
    assert "max" not in params
    headers = session.get.call_args.kwargs["headers"]
    assert headers["Accept"] == "application/x-ndjson"
    assert "Authorization" not in headers
    url = session.get.call_args.args[0]
    assert url == LICHESS_GAMES_URL.format(username="cmess4401")


def test_does_not_buffer_all_games_before_yielding():
    seen: list[str] = []

    def lines():
        yield json.dumps({"id": "one"}).encode()
        seen.append("after-first")
        yield json.dumps({"id": "two"}).encode()

    class StreamingResponse(_FakeResponse):
        def iter_lines(self):
            yield from lines()

    session = MagicMock()
    session.get.return_value = StreamingResponse(200, [])
    client = LichessClient(session=session)
    iterator = client.iter_user_games("cmess4401")
    first = next(iterator)
    assert first["id"] == "one"
    assert seen == []
    second = next(iterator)
    assert seen == ["after-first"]
    assert second["id"] == "two"


def test_skips_invalid_ndjson_and_continues():
    session = MagicMock()
    session.get.return_value = _FakeResponse(
        200,
        [b"not-json", b'{"id":"ok"}', b"123"],
    )
    client = LichessClient(session=session)
    games = list(client.iter_user_games("user"))
    assert [g["id"] for g in games] == ["ok"]


def test_token_sets_authorization_header(monkeypatch):
    monkeypatch.delenv("LICHESS_TOKEN", raising=False)
    monkeypatch.delenv("LICHESS_API_TOKEN", raising=False)
    session = MagicMock()
    session.get.return_value = _FakeResponse(200, [b'{"id":"a"}'])
    client = LichessClient(session=session, token="secret-token")
    list(client.iter_user_games("user"))
    assert session.get.call_args.kwargs["headers"]["Authorization"] == "Bearer secret-token"


def test_env_lichess_api_token_is_preferred(monkeypatch):
    monkeypatch.setenv("LICHESS_API_TOKEN", "api-token-from-env")
    monkeypatch.setenv("LICHESS_TOKEN", "legacy-token")
    session = MagicMock()
    session.get.return_value = _FakeResponse(200, [b'{"id":"a"}'])
    client = LichessClient(session=session)
    list(client.iter_user_games("user"))
    assert session.get.call_args.kwargs["headers"]["Authorization"] == "Bearer api-token-from-env"


def test_http_429_waits_at_least_60_seconds():
    sleeps: list[float] = []
    ok = _FakeResponse(200, [b'{"id":"after-wait"}'])
    limited = _FakeResponse(429, [], headers={"Retry-After": "60"})
    session = MagicMock()
    session.get.side_effect = [limited, ok]
    client = LichessClient(session=session, sleep=sleeps.append, rate_limit_wait_s=RATE_LIMIT_WAIT_S)
    games = list(client.iter_user_games("user"))
    assert games[0]["id"] == "after-wait"
    assert sleeps
    assert sleeps[0] >= 60


def test_http_400_raises_without_retry():
    session = MagicMock()
    session.get.return_value = _FakeResponse(400, [])
    client = LichessClient(session=session, sleep=lambda _s: None)
    with pytest.raises(LichessClientError, match="HTTP 400"):
        list(client.iter_user_games("user"))
    assert session.get.call_count == 1


def test_since_until_iso_dates_become_millis():
    session = MagicMock()
    session.get.return_value = _FakeResponse(200, [])
    client = LichessClient(session=session)
    list(client.iter_user_games("user", since="2026-01-01", until="2026-12-31"))
    params = session.get.call_args.kwargs["params"]
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    end = datetime(2026, 12, 31, 23, 59, 59, 999000, tzinfo=timezone.utc)
    assert params["since"] == int(start.timestamp() * 1000)
    assert params["until"] == int(end.timestamp() * 1000)
