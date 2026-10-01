import os
from typing import Any

from firebase_admin import App, credentials, get_app, initialize_app

from app.configuration.application_settings import ApplicationSettings


def get_firebase_administration_application(settings: ApplicationSettings) -> App:
    """Initializes Firebase Admin with Cloud Run ADC or local development credentials."""

    try:
        return get_app()
    except ValueError:
        credential = _get_firebase_administration_credential()
        options: dict[str, Any] = {}
        if settings.firebase_project_id:
            options["projectId"] = settings.firebase_project_id
        return initialize_app(credential=credential, options=options or None)


def _get_firebase_administration_credential() -> credentials.Base:
    project_id = os.getenv("FIREBASE_ADMIN_PROJECT_ID")
    client_email = os.getenv("FIREBASE_ADMIN_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_ADMIN_PRIVATE_KEY")

    has_any_explicit_field = bool(project_id or client_email or private_key)
    has_all_explicit_fields = bool(project_id and client_email and private_key)

    if has_any_explicit_field and not has_all_explicit_fields:
        raise RuntimeError(
            "Set all FIREBASE_ADMIN_* values or use GOOGLE_APPLICATION_CREDENTIALS.",
        )

    if has_all_explicit_fields:
        return credentials.Certificate(
            {
                "type": "service_account",
                "project_id": project_id,
                "client_email": client_email,
                "private_key": private_key.replace("\\n", "\n"),
                "token_uri": "https://oauth2.googleapis.com/token",
            },
        )

    return credentials.ApplicationDefault()
