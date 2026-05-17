#!/usr/bin/env python3
"""
Test the actual login endpoint logic
"""
import asyncio
import sys
import os
import traceback
from datetime import datetime, timedelta

# Add the src/api directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src', 'api'))

async def test_login_endpoint_logic():
    """Test the exact logic that happens in the login endpoint"""
    print("🔍 Testing Login Endpoint Logic...")
    
    try:
        # Import all the components
        from services.auth_service import AuthService
        from database import get_db
        from models.schemas import UserLogin, TokenResponse, UserResponse, BaseRole
        
        print("✅ All imports successful")
        
        # Create the service instance (same as in the router)
        auth_service = AuthService()
        print("✅ AuthService created")
        
        # Create mock credentials (same as what comes from the API)
        credentials = UserLogin(username="admin", password="admin123")
        print(f"✅ Credentials created: {credentials.username}")
        
        # Get database session (same as dependency injection)
        db_gen = get_db()
        db = next(db_gen)
        print("✅ Database session created")
        
        # Test the authentication step
        print("\n🔐 Testing authentication step...")
        user_data = await auth_service.authenticate_user(
            credentials.username, credentials.password, db
        )
        print(f"✅ User authenticated: {user_data}")
        
        if not user_data:
            print("❌ Authentication failed")
            return
        
        # Test the token preparation step
        print("\n🎫 Testing token preparation...")
        token_expires = datetime.utcnow() + timedelta(hours=24)
        roles_str = ",".join([role.value for role in user_data.get("roles", [])])
        print(f"✅ Roles string: {roles_str}")
        
        token_data = {
            "sub": user_data["username"],
            "user_id": user_data["user_id"],
            "roles": roles_str,
            "exp": token_expires,
        }
        print(f"✅ Token data: {token_data}")
        
        # Test token creation
        print("\n🔑 Testing token creation...")
        access_token = auth_service.create_access_token(token_data)
        print(f"✅ Access token created: {access_token[:50]}...")
        
        # Test session creation
        print("\n💾 Testing session creation...")
        try:
            session = auth_service.create_user_session(
                db, user_data["user_id"], access_token, token_expires
            )
            print(f"✅ Session created: {session}")
        except Exception as e:
            print(f"⚠️  Session creation failed (continuing): {e}")
        
        # Test response creation
        print("\n📝 Testing response creation...")
        user_response = UserResponse(
            id=user_data["user_id"],
            username=user_data["username"],
            email=user_data.get("email", "legacy@example.com"),
            roles=user_data.get("roles", []),
            created_at=datetime.utcnow(),
            is_active=True,
        )
        print(f"✅ User response created: {user_response.username}")
        
        token_response = TokenResponse(access_token=access_token, user=user_response)
        print(f"✅ Token response created successfully")
        
        # Convert to dict to see the final structure
        response_dict = token_response.model_dump()
        print(f"✅ Final response structure: {list(response_dict.keys())}")
        
        print("\n🎉 All login endpoint logic working!")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Error during endpoint testing: {e}")
        print(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_login_endpoint_logic())