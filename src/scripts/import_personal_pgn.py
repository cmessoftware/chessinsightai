"""
Script para importar un PGN personal del usuario
Guarda las partidas con el usuario que las importó
"""

import os
import sys
from pathlib import Path
import chess.pgn
from dotenv import load_dotenv

sys.path.append(str(Path(__file__).parent.parent))

from db.repository.games_repository import GamesRepository
from modules.pgn_batch_loader import extract_features_from_game

load_dotenv()


def import_personal_pgn(file_path: str, username: str, source: str = "personal"):
    """
    Importa un archivo PGN personal marcándolo con el usuario

    Args:
        file_path: Ruta al archivo PGN
        username: Usuario que importa
        source: Fuente de las partidas (default: "personal")
    """
    repo = GamesRepository()
    imported = 0
    skipped = 0

    print(f"📦 Importando {file_path} para usuario {username}")

    try:
        with open(file_path) as pgn_file:
            while True:
                game = chess.pgn.read_game(pgn_file)
                if game is None:
                    break

                # Extraer features del juego
                pgn_str = str(game)
                game_data = extract_features_from_game(pgn_str)
                game_data["source"] = source
                game_data["imported_by"] = username  # NUEVO: marcar usuario

                # Verificar si ya existe
                if not repo.game_exists(game_data["game_id"]):
                    repo.save_game(game_data)
                    imported += 1
                    print(f"✅ Importada: {game_data['game_id']}")
                else:
                    skipped += 1
                    print(f"⏭️  Ya existe: {game_data['game_id']}")

        repo.commit()
        print(f"🏁 Importación completa: {imported} importadas, {skipped} omitidas")
        return {"imported": imported, "skipped": skipped}

    except Exception as e:
        repo.rollback()
        print(f"❌ Error: {e}")
        raise e
    finally:
        repo.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python import_personal_pgn.py <archivo_pgn> <username> [source]")
        sys.exit(1)

    file_path = sys.argv[1]
    username = sys.argv[2]
    source = sys.argv[3] if len(sys.argv) > 3 else "personal"

    import_personal_pgn(file_path, username, source)
