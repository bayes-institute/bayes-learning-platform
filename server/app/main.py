from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.configuration.application_settings import load_application_settings
from app.health.health_routes import health_router
from app.identity.authenticated_user_routes import authenticated_user_router


def create_application() -> FastAPI:
    settings = load_application_settings()
    application = FastAPI(
        title="Bayes Learning Platform Server",
        version="0.1.0",
        docs_url="/docs" if settings.application_environment != "production" else None,
        redoc_url=None,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_client_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=600,
    )
    application.include_router(health_router)
    application.include_router(authenticated_user_router)
    return application


application = create_application()
