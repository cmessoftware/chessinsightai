from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import dotenv
import os
dotenv.load_dotenv()

from db.postgres_url import resolve_postgres_url

DATABASE_URL = resolve_postgres_url()

if DATABASE_URL and DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={
                           "check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_schema():
    return "public" if engine.dialect.name == "postgresql" else None


def get_session():
    return SessionLocal()
