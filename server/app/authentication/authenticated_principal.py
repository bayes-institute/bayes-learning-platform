from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    """Identity data derived only from a Firebase-verified token."""

    user_id: str
    email: str | None
    display_name: str | None
    email_is_verified: bool
    roles: frozenset[str]

    @classmethod
    def from_verified_firebase_token(
        cls,
        verified_token: Mapping[str, Any],
    ) -> "AuthenticatedPrincipal":
        token_roles = verified_token.get("roles", ())
        if isinstance(token_roles, str):
            token_roles = (token_roles,)
        if not isinstance(token_roles, (list, tuple, set, frozenset)):
            token_roles = ()

        return cls(
            user_id=str(verified_token["uid"]),
            email=verified_token.get("email"),
            display_name=verified_token.get("name"),
            email_is_verified=bool(verified_token.get("email_verified", False)),
            roles=frozenset(role for role in token_roles if isinstance(role, str)),
        )
