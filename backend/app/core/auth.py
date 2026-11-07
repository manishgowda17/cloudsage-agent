"""InsForge Authentication & JWT Verification Dependency.

Verifies user access tokens with the trusted InsForge Auth Service
(GET /api/auth/sessions/current) to ensure only authenticated users
can trigger protected Kubernetes investigations.
"""

from typing import Any, Dict, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import httpx
from app.core.config import settings
from app.core.logging import logger

# HTTP Bearer scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """Validate incoming InsForge access token against the InsForge Auth API.

    Returns:
        Dict containing authenticated user profile (e.g. id, email).

    Raises:
        HTTPException 401 if token is absent, invalid, or expired.
    """
    if not credentials or not credentials.credentials:
        logger.warning("Investigation attempt rejected: Missing Bearer token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in via InsForge to investigate clusters.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials.strip()

    # Call trusted InsForge auth endpoint to verify the session
    url = f"{settings.INSFORGE_URL.rstrip('/')}/api/auth/sessions/current"
    headers = {
        "Authorization": f"Bearer {token}",
    }
    if settings.INSFORGE_ANON_KEY:
        headers["apikey"] = settings.INSFORGE_ANON_KEY

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)

        if response.status_code != 200:
            logger.warning(
                f"InsForge token validation rejected with HTTP {response.status_code}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired InsForge authentication token. Please re-authenticate.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        body = response.json()
        user = body.get("user")
        if not user or not user.get("id"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authenticated user identity could not be verified.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.info(f"Authorized investigation request for user ID: {user['id']}")
        return user

    except HTTPException:
        raise
    except httpx.RequestError as req_err:
        logger.error(f"Failed to communicate with InsForge auth service: {req_err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication verification service currently unreachable.",
        )
    except Exception as exc:
        logger.error(f"Unexpected error validating InsForge token: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[Dict[str, Any]]:
    """Validate incoming token if provided; returns None if omitted or invalid."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials)
    except Exception:
        return None
