# Server

FastAPI is the trusted business-logic boundary. It verifies Firebase bearer
tokens, derives principals from verified claims, and will own privileged actions
such as grading finalization, publishing, entitlements, webhooks, and signed
media URLs.

Run locally:

    python -m venv .venv
    .venv/Scripts/activate
    pip install -r requirements-dev.txt
    copy .env.example .env
    uvicorn app.main:application --reload --port 8000

The health endpoint is available without credentials at /healthz. The
authenticated-user endpoint at /v1/authenticated-user requires a Firebase
bearer token.
