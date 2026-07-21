"""
Clerk session-token verification.

The /progress endpoints are the product's retention loop, so they must act on
*who the caller actually is*, not on a user id the caller typed. This verifies
the Clerk session JWT the browser sends and returns its `sub` (the real Clerk
user id) — a forged or altered id can't pass because the token is signed by
Clerk and checked against Clerk's public keys.

No secret is needed: verification is public-key crypto. We derive Clerk's
issuer and JWKS URL from the *publishable* key (which is already public), fetch
the JWKS once, and cache it.

Degrades deliberately: with no CLERK_PUBLISHABLE_KEY configured the dependency
returns None and the endpoints fall back to a client-supplied id. That keeps
local development and a keyless clone working, exactly like GITHUB_TOKEN /
GROQ_API_KEY elsewhere — but a real deployment sets the key and enforcement
turns on automatically.
"""

from __future__ import annotations

import base64
from typing import Optional

import jwt
from jwt import PyJWKClient
from fastapi import Header, HTTPException
from loguru import logger

from app.core.config import settings

# Small clock-skew allowance so a token minted a second in the future (or an
# almost-expired one) doesn't spuriously 401.
_LEEWAY_SECONDS = 30

_jwks_client: Optional[PyJWKClient] = None
_issuer: Optional[str] = None


def _frontend_api_host(publishable_key: str) -> Optional[str]:
    """Clerk encodes the Frontend API host in the publishable key:
    'pk_test_<base64(host + "$")>'. Decode it back out."""
    try:
        b64 = publishable_key.split("_", 2)[2]
        # base64 without padding — restore it before decoding.
        padded = b64 + "=" * (-len(b64) % 4)
        decoded = base64.b64decode(padded).decode("utf-8")
        return decoded.rstrip("$") or None
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Could not derive Clerk frontend host from publishable key: {e}")
        return None


def clerk_enabled() -> bool:
    return bool(settings.CLERK_PUBLISHABLE_KEY)


def _ensure_client() -> tuple[PyJWKClient, str]:
    """Lazily build (and cache) the JWKS client + expected issuer."""
    global _jwks_client, _issuer
    if _jwks_client is not None and _issuer is not None:
        return _jwks_client, _issuer

    host = _frontend_api_host(settings.CLERK_PUBLISHABLE_KEY)
    if not host:
        raise HTTPException(status_code=500, detail="Clerk is misconfigured")
    _issuer = f"https://{host}"
    _jwks_client = PyJWKClient(f"{_issuer}/.well-known/jwks.json")
    logger.info(f"Clerk auth enabled — verifying tokens issued by {_issuer}")
    return _jwks_client, _issuer


def verify_clerk_token(token: str) -> str:
    """Verify a Clerk session JWT and return its subject (the Clerk user id).

    Raises HTTPException(401) for anything that isn't a valid, unexpired token
    signed by this Clerk instance.
    """
    client, issuer = _ensure_client()
    try:
        signing_key = client.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer,
            leeway=_LEEWAY_SECONDS,
            options={"require": ["exp", "iat", "sub"]},
        )
    except Exception as e:  # noqa: BLE001 — any failure is an auth failure
        logger.debug(f"Clerk token rejected: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token missing subject")
    return sub


def _bearer(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None
    return None


def verified_clerk_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """FastAPI dependency → the verified Clerk user id, or None in dev mode.

    - Clerk configured: a valid Bearer token is REQUIRED; returns its `sub`.
      A missing or bad token is a 401 before the endpoint runs, so any endpoint
      that receives a non-None value can trust it completely.
    - Clerk not configured (local/dev): returns None and lets the endpoint fall
      back to a client-supplied id.
    """
    if not clerk_enabled():
        return None
    token = _bearer(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    return verify_clerk_token(token)
