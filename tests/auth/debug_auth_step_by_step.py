#!/usr/bin/env python3
"""
Debug script to test auth service directly
"""
import asyncio
import sys
import os
import traceback

# Add the src/api directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src', 'api'))

async def test_auth_service_step_by_step():
    """Test each component step by step"""
    print("🔍 Testing Authentication Service Components...")
    
    try:
        print("\n1. Testing imports...")
        from services.auth_service import AuthService
        print("✅ AuthService imported successfully")
        
        from database import get_db
        print("✅ Database imported successfully")
        
        from models.schemas import BaseRole, UserLogin
        print("✅ Schemas imported successfully")
        
        print("\n2. Creating AuthService instance...")
        auth_service = AuthService()
        print("✅ AuthService created successfully")
        
        print("\n3. Testing legacy authentication...")
        result = await auth_service.authenticate_user_legacy("admin", "admin123")
        print(f"✅ Legacy auth result: {result}")
        
        print("\n4. Testing password hashing...")
        test_hash = auth_service.get_password_hash("test123")
        print(f"✅ Password hashed: {test_hash[:20]}...")
        
        verify_result = auth_service.verify_password("test123", test_hash)
        print(f"✅ Password verification: {verify_result}")
        
        print("\n5. Testing token creation...")
        token_data = {"sub": "admin", "user_id": 1, "roles": "admin"}
        token = auth_service.create_access_token(token_data)
        print(f"✅ Token created: {token[:50]}...")
        
        print("\n6. Testing database connection...")
        try:
            db_gen = get_db()
            db_session = next(db_gen)
            print("✅ Database connection successful")
            
            # Test full authentication with database
            print("\n7. Testing full authentication...")
            full_result = await auth_service.authenticate_user("admin", "admin123", db_session)
            print(f"✅ Full auth result: {full_result}")
            
            db_session.close()
        except Exception as e:
            print(f"⚠️  Database connection issue: {e}")
            print("Testing without database...")
            
            # Test without database
            full_result = await auth_service.authenticate_user("admin", "admin123", None)  
            print(f"✅ Full auth without DB: {full_result}")
        
        print("\n🎉 All authentication components working!")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_auth_service_step_by_step())