from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth

from app.authentication.authenticated_principal import AuthenticatedPrincipal
from app.authentication.firebase_administration import get_firebase_administration_application
from app.configuration.application_settings import ApplicationSettings, load_application_settings


def get_application_settings() -> ApplicationSettings:
    return load_application_settings()


def require_authenticated_principal(
    authorization: Annotated[str | None, Header()] = None,
    settings: ApplicationSettings = Depends(get_application_settings),
) -> AuthenticatedPrincipal:
    """Returns an identity only after Firebase Admin has verified the bearer token."""

    identity_token = _extract_bearer_token(authorization)
    firebase_application = get_firebase_administration_application(settings)

    try:
        verified_token = auth.verify_id_token(
            identity_token,
            app=firebase_application,
            check_revoked=True,
        )
    except auth.InvalidIdTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The Firebase identity token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication verification is temporarily unavailable.",
        ) from error

    return AuthenticatedPrincipal.from_verified_firebase_token(verified_token)


def require_verified_email(
    principal: AuthenticatedPrincipal = Depends(require_authenticated_principal),
) -> AuthenticatedPrincipal:
    """Requires a Firebase-verified identity whose email address is verified.

    Costly operations and ownership-changing routes must depend on this helper
    in addition to their feature-specific authorization and quota controls.
    """

    if not principal.email_is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A verified email address is required for this operation.",
        )

    return principal


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A Firebase bearer token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    identity_token = authorization.removeprefix("Bearer ").strip()
    if not identity_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A Firebase bearer token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return identity_token
