# SPEC: sdd_engine (Spec-Driven Decision Engine) — UPDATED

## PURPOSE

Build a **decoupled, spec-driven validation engine** that:

- Uses **OpenSpec as the single source of truth (rules)**
- Loads specs at runtime via a **parser**
- Executes rules via a **deterministic validator**
- Persists execution metadata (not rules) in **SQLite (SQLAlchemy)**
- Is **fully independent from ChessInsight**
- Can be:
  - extracted to another repo
  - packaged as a pip module
  - migrated to PostgreSQL without refactor
- Exposes services via **FastAPI**

---

## CORE PRINCIPLE

```text
OpenSpec (WHAT) ≠ Runtime (EXECUTION)

