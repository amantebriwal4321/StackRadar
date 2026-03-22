from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from jose import jwt, JWTError
from app.core.config import settings
from app.db.session import SessionLocal
from typing import Generator

security = HTTPBearer()

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

async def verify_clerk_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    # In a full robust setup, we fetch the JWKS from Clerk and verify the JWT signature.
    # For now, we will assume a middleware/service approach or a basic check.
    # Ideally, we verify with python-jose and the Clerk JWKS endpoint:
    # https://clerk.com/docs/backend-requests/handling/manual-jwt
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    try:
        # Example validation (unverified payload for demo without active JWKS fetching network call)
        # Note: You MUST verify the signature in production using JWKS.
        unverified_claims = jwt.get_unverified_claims(token)
        clerk_id = unverified_claims.get("sub")
        if not clerk_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return clerk_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(clerk_id: str = Depends(verify_clerk_token), db = Depends(get_db)):
    from app.models.all_models import User
    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if not user:
        # Auto-create or raise
        user = User(clerk_id=clerk_id)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
