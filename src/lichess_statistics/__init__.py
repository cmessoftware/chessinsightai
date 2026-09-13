"""Standalone Lichess statistics tool (LS01). Independent of ACC and Module 07."""

from lichess_statistics.client import LichessClient, LichessClientError

__all__ = ["LichessClient", "LichessClientError"]
