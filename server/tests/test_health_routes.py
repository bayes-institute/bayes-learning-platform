from fastapi.testclient import TestClient

from app.main import create_application


def test_healthz_route_is_available_without_authentication() -> None:
    client = TestClient(create_application())

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "server"}


def test_health_route_is_not_found() -> None:
    client = TestClient(create_application())

    response = client.get("/health")

    assert response.status_code == 404


def test_protected_route_rejects_a_request_without_a_firebase_bearer_token() -> None:
    client = TestClient(create_application())

    response = client.get("/v1/authenticated-user")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_cors_preflight_allows_only_the_configured_local_client_origin() -> None:
    client = TestClient(create_application())

    response = client.options(
        "/v1/authenticated-user",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
