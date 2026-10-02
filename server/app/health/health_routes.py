from fastapi import APIRouter

health_router = APIRouter(tags=["health"])


@health_router.get("/health")
def get_service_health() -> dict[str, str]:
    """Liveness check with no identity, database, or third-party dependency."""

    return {"status": "ok", "service": "server"}
