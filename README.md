# Bayes Learning Platform

The repository is organized around three human-facing areas:

| Folder | Responsibility |
| --- | --- |
| [client](client/README.md) | Next.js learner experience, Firebase browser sign-in, and same-origin HttpOnly session cookies used for protected server-rendered pages. |
| [server](server/README.md) | FastAPI business API, Firebase bearer-token verification, authorization, and future privileged operations. |
| [planning](planning/README.md) | Architecture decisions, data-model scratchpads, and deployment runbooks. |

## Authentication ownership

Firebase Authentication issues identity. Client owns interactive browser sign-in and its own secure session cookie because a cookie scoped to the client origin is what lets Next protect server-rendered routes. Server never trusts a user ID or role sent by the browser: it verifies the Firebase bearer token and derives the identity from the verified claims for every protected API operation.

Firestore may be read directly by the browser only where Firestore Security Rules are the access-control authority. FastAPI owns privileged mutations, authorization decisions, grading, publishing, entitlements, payment webhooks, and media signing. This keeps ordinary client reads from becoming unnecessary server work.

## Local development

### Run without Docker

Docker is optional for local development. Install Node.js 20.9 or newer and Python 3.10 or newer, then install the two services' dependencies once:

```sh
cd client && npm ci
cd ../server && python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt
```

On Windows, create the server environment with `python -m venv .venv` and install with `.venv\Scripts\python.exe -m pip install -r requirements.txt` from the `server` directory. If Python is available only through the Python Launcher, use a specific installed version such as `py -3.12 -m venv .venv`.

Start both services from the repository root:

```sh
bash scripts/start-dev.sh       # Linux
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1  # Windows PowerShell
```

The scripts create `client/.env.local` and `server/.env` from their examples when missing, check dependencies and ports, start the client and API, and wait for both `/health` routes. Add Firebase browser settings to `client/.env.local` to use sign-in. If port 3000 or 8000 is occupied, the script shows the owning process and asks before stopping it. Press Ctrl+C to stop both services. On Windows, service output is written to the ignored `.local-dev` folder.

### Run with Docker Compose

1. Copy client/.env.example to client/.env.local and server/.env.example to server/.env.
2. Configure Firebase browser values in client/.env.local.
3. Set the allowed origin in server/.env to http://localhost:3000.
4. To start the health routes and browser-facing UI, run:

   docker compose --env-file client/.env.local up --build

5. For protected Docker calls using a service-account JSON file, copy docker-compose.credentials.example.yml to docker-compose.credentials.yml, set FIREBASE_ADMIN_CREDENTIALS_FILE in client/.env.local to the absolute host path of that ignored file, then run:

   docker compose --env-file client/.env.local -f docker-compose.yml -f docker-compose.credentials.yml up --build

Client is available at http://localhost:3000, server at http://localhost:8000, and both liveness endpoints are available at /health without authentication. The optional credential overlay is not needed for a health-only start.

For deployment, start with [the Cloud Run client/server runbook](planning/01_CLOUD_RUN_CLIENT_SERVER_DEPLOYMENT.md).

The repository now includes GitHub Actions CI at .github/workflows/ci.yml.
The production deployment workflow remains intentionally documented rather than
activated until the Google Cloud project, runtime accounts, and GitHub OIDC
trust in the runbook have been created.
