from fastapi import APIRouter, Depends

from app.authentication.authenticated_principal import AuthenticatedPrincipal
from app.authentication.require_authenticated_principal import require_authenticated_principal

authenticated_user_router = APIRouter(prefix="/v1", tags=["identity"])


@authenticated_user_router.get("/authenticated-user")
def get_authenticated_user(
    principal: AuthenticatedPrincipal = Depends(require_authenticated_principal),
) -> dict[str, object]:
    """Returns only identity facts derived from a verified Firebase token."""

    return {
        "userId": principal.user_id,
        "email": principal.email,
        "displayName": principal.display_name,
        "emailIsVerified": principal.email_is_verified,
        "roles": sorted(principal.roles),
    }
