from dataclasses import dataclass
import os


class ApplicationConfigurationError(RuntimeError):
    """Raised when a deployment lacks required non-secret configuration."""


@dataclass(frozen=True)
class ApplicationSettings:
    application_environment: str
    allowed_client_origins: tuple[str, ...]
    firebase_project_id: str | None


def load_application_settings() -> ApplicationSettings:
    application_environment = os.getenv("APPLICATION_ENV", "development").strip().lower()
    configured_origins = os.getenv("SERVER_ALLOWED_CLIENT_ORIGINS", "").strip()

    if configured_origins:
        allowed_client_origins = tuple(
            origin.strip().rstrip("/")
            for origin in configured_origins.split(",")
            if origin.strip()
        )
    elif application_environment == "production":
        raise ApplicationConfigurationError(
            "SERVER_ALLOWED_CLIENT_ORIGINS must list the production client origin.",
        )
    else:
        allowed_client_origins = ("http://localhost:3000",)

    if not allowed_client_origins:
        raise ApplicationConfigurationError(
            "At least one client origin must be configured for the API.",
        )

    return ApplicationSettings(
        application_environment=application_environment,
        allowed_client_origins=allowed_client_origins,
        firebase_project_id=os.getenv("FIREBASE_PROJECT_ID") or os.getenv("FIREBASE_ADMIN_PROJECT_ID"),
    )
