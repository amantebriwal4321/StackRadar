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

Degrades deliberately, but only locally: with no CLERK_PUBLISHABLE_KEY on a
SQLite database the dependency returns None and the endpoints fall back to a
client-supplied id, so a keyless clone works like it does without GITHUB_TOKEN.
Anywhere else a missing key is a 503, not an open door.
"""

from __future__ import annotations

import base64
import os

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient
from loguru import logger

from app.core.config import settings

# Small clock-skew allowance so a token minted a second in the future (or an
# almost-expired one) doesn't spuriously 401.
_LEEWAY_SECONDS = 30

_jwks_client: PyJWKClient | None = None
_issuer: str | None = None


def _frontend_api_host(publishable_key: str) -> str | None:
    """Clerk encodes the Frontend API host in the publishable key:
    'pk_test_<base64(host + "$")>'. Decode it back out."""
    try:
        b64 = publishable_key.split("_", 2)[2]
        # base64 without padding — restore it before decoding.
        padded = b64 + "=" * (-len(b64) % 4)
        decoded = base64.b64decode(padded).decode("utf-8")
        return decoded.rstrip("$") or None
    except Exception as e:  # noqa: BLE001
        logger.warning(
            f"Could not derive Clerk frontend host from publishable key: {e}"
        )
        return None


def clerk_enabled() -> bool:
    return bool(settings.CLERK_PUBLISHABLE_KEY)


def unverified_ids_allowed() -> bool:
    """May a keyless server trust a client-supplied user id?

    Only on a local SQLite database, or when ALLOW_UNVERIFIED_USER_ID=1 says so
    explicitly. This used to be decided by the Clerk key alone, so a deployment
    that forgot the key silently let anyone read any account's progress and
    notification email by passing its user_id. A Postgres server (Render/Neon,
    a docker-compose VPS) with no key now refuses instead of trusting.
    """
    if os.getenv("ALLOW_UNVERIFIED_USER_ID", "0") == "1":
        return True
    return settings.SQLALCHEMY_DATABASE_URI.startswith("sqlite")


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


def _bearer(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None
    return None


def verified_clerk_user(authorization: str | None = Header(None)) -> str | None:
    """FastAPI dependency → the verified Clerk user id, or None in dev mode.

    - Clerk configured: a valid Bearer token is REQUIRED; returns its `sub`.
      A missing or bad token is a 401 before the endpoint runs, so any endpoint
      that receives a non-None value can trust it completely.
    - Clerk not configured (local/dev): returns None and lets the endpoint fall
      back to a client-supplied id.
    - Clerk not configured on anything that is not local dev: 503, never a
      fallback (see `unverified_ids_allowed`).
    """
    if not clerk_enabled():
        if unverified_ids_allowed():
            return None
        logger.error(
            "CLERK_PUBLISHABLE_KEY is not set - refusing user-data requests. "
            "Set it, or ALLOW_UNVERIFIED_USER_ID=1 for a trusted dev box."
        )
        raise HTTPException(
            status_code=503, detail="Sign-in is not configured on this server"
        )
    token = _bearer(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    return verify_clerk_token(token)
