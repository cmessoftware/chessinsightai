"""JSON-friendly serialization for mental model assessments."""

from __future__ import annotations

from enum import Enum
from typing import Any


def _json_value(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, list):
        return [_json_value(v) for v in value]
    if isinstance(value, dict):
        return {k: _json_value(v) for k, v in value.items()}
    if hasattr(value, "__dataclass_fields__"):
        return {k: _json_value(getattr(value, k)) for k in value.__dataclass_fields__}
    return value


def mental_model_to_json(assessment: Any) -> dict[str, Any]:
    return _json_value(assessment)
