from db.postgres_url import _normalize_postgres_url


def test_bare_postgres_url_uses_psycopg3():
    url = _normalize_postgres_url(
        "postgresql://user:pass@ep-example.neon.tech/neondb?sslmode=require"
    )
    assert url.startswith("postgresql+psycopg://")
    assert url.endswith("?sslmode=require")


def test_postgres_scheme_alias_uses_psycopg3():
    url = _normalize_postgres_url("postgres://user:pass@localhost:5434/chess")
    assert url == "postgresql+psycopg://user:pass@localhost:5434/chess"


def test_explicit_driver_is_left_alone():
    explicit = "postgresql+psycopg2://user:pass@localhost/db"
    assert _normalize_postgres_url(explicit) == explicit
