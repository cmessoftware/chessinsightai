#!/usr/bin/env python3
"""
Debug pagination query directly
"""

import os
import sys
from pathlib import Path

# Add src directory to Python path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

from db.postgres_utils import PostgreSQLConnection

def debug_pagination_query():
    """Debug the pagination query directly"""
    print("🔍 Debugging pagination query directly")
    
    pg_conn = PostgreSQLConnection()
    
    # Test basic games query
    print("\n1. Testing basic COUNT query...")
    result = pg_conn.execute_query("SELECT COUNT(*) as count FROM games;")
    if result:
        print(f"   ✅ Total games: {result[0]['count']:,}")
    else:
        print("   ❌ No result from COUNT query")
        return
    
    # Test the exact query used in pagination
    print("\n2. Testing pagination query...")
    games_query = """
        SELECT 
            game_id,
            white_player,
            black_player,
            white_elo,
            black_elo,
            result,
            date_played,
            opening,
            time_control,
            source
        FROM games 
        ORDER BY date_played DESC, game_id DESC
        LIMIT %s OFFSET %s
    """
    
    params = [5, 0]  # page 1, per_page 5
    
    result = pg_conn.execute_query(games_query, params)
    
    if result:
        print(f"   ✅ Pagination query returned: {len(result)} games")
        for i, game in enumerate(result, 1):
            print(f"      {i}. {game['white_player']} vs {game['black_player']} ({game['result']})")
    else:
        print("   ❌ No result from pagination query")
    
    # Test the first few games without LIMIT/OFFSET
    print("\n3. Testing basic games query without pagination...")
    basic_query = """
        SELECT 
            game_id,
            white_player,
            black_player,
            result,
            date_played
        FROM games 
        ORDER BY date_played DESC, game_id DESC
    """
    
    result = pg_conn.execute_query(basic_query)
    
    if result:
        print(f"   ✅ Basic query returned: {len(result)} games")
        print("   First 3 games:")
        for i, game in enumerate(result[:3], 1):
            print(f"      {i}. {game['white_player']} vs {game['black_player']} - {game['date_played']}")
    else:
        print("   ❌ No result from basic query")
        
if __name__ == "__main__":
    debug_pagination_query()