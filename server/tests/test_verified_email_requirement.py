import pytest
from fastapi import HTTPException, status

from app.authentication.authenticated_principal import AuthenticatedPrincipal
from app.authentication.require_authenticated_principal import require_verified_email


def test_verified_email_requirement_allows_a_verified_principal() -> None:
    principal = AuthenticatedPrincipal(
        user_id="verified-user",
        email="learner@example.com",
        display_name=None,
        email_is_verified=True,
        roles=frozenset(),
    )

    assert require_verified_email(principal) is principal


def test_verified_email_requirement_rejects_an_unverified_principal() -> None:
    principal = AuthenticatedPrincipal(
        user_id="unverified-user",
        email="learner@example.com",
        display_name=None,
        email_is_verified=False,
        roles=frozenset(),
    )

    with pytest.raises(HTTPException) as error:
        require_verified_email(principal)

    assert error.value.status_code == status.HTTP_403_FORBIDDEN
