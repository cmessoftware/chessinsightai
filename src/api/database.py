import os
import dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Cargar .env de la raíz del repo (uvicorn suele arrancar desde src/api)
_api_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.abspath(os.path.join(_api_dir, "..", ".."))
dotenv.load_dotenv(os.path.join(_repo_root, ".env"))
dotenv.load_dotenv()

# URL de la base de datos PostgreSQL (dev: start_db.ps1 → 5434)
DATABASE_URL = os.environ.get(
    "CHESS_TRAINER_DB_URL",
    "postgresql://chess:chess_pass@localhost:5434/chess_trainer_db",
)

# Crear motor de base de datos
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Dependency para obtener sesión de base de datos
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()