# 01 — Cloud Run client/server deployment runbook

## Final outcome

Deploy two independent Cloud Run services in the existing Firebase/Google Cloud project:

| Service | Application | Minimum instances | Initial scaling and size |
| --- | --- | ---: | --- |
| bayes-client | Next.js frontend, including the current server-side session routes | 0 | Request-based billing; 1 vCPU; 512 MiB; maximum 3 |
| bayes-server | FastAPI business API | 0 | Request-based billing; 1 vCPU; 512 MiB; maximum 3 |

Both services scale to zero and share the Cloud Run free allowance at the billing-account level. They are not permanently allocated virtual machines. At prototype traffic, their fixed compute cost is therefore zero.

Keep the applications separate. Do not run Next and FastAPI as two processes behind a single container/proxy just to reduce the number of services. Separate services provide independent deploys, logs, memory, scaling, and fault isolation.

## Delivery approach

Use GitHub Actions for both CI and CD.

- CI runs checks on every pull request and never deploys.
- CD runs only after a change reaches the protected main branch.
- CD builds one immutable container image per application, tags it with the Git commit SHA, pushes it to Artifact Registry, deploys both Cloud Run services, and runs health checks.
- GitHub Actions authenticates to Google through GitHub OIDC and Google Workload Identity Federation. Do not store a Google service-account JSON key in GitHub.

This is cost-effective because GitHub handles the small prototype builds, Cloud Run scales to zero, and Artifact Registry stores the images close to the services. Public GitHub repositories have free standard runner usage; private repositories have plan-dependent included minutes. Artifact Registry includes 0.5 GiB-month of storage per billing account, so image cleanup must be enabled. [GitHub Actions billing](https://docs.github.com/en/actions/concepts/billing-and-usage) · [Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing)

## Step 1 — refactor the codebase (owner task)

Complete this before starting the cloud steps. The target layout can be:

~~~text
client/                       Next.js app
  Dockerfile
  package.json
server/                       FastAPI app
  Dockerfile
  requirements.txt or pyproject.toml
.github/workflows/
  ci.yml
  deploy-production.yml
~~~

The exact folder names may differ, but client and server must be independently buildable.

### Local environment preflight

Before running the app locally, install Node.js 20.9 or newer and Python 3.10 or newer, then install each service's dependencies as described in the root README. Docker is optional. From the repository root, run `scripts/start-dev.sh` on Linux or `scripts/start-dev.ps1` in Windows PowerShell. The startup script creates `client/.env.local` and `server/.env` from their examples if they do not exist. Review and fill these local files; they are ignored by Git and must not be committed.

There are two levels of local configuration:

- **Start the public client and health endpoints:** the example values for the local URLs and server origin are sufficient. Firebase credentials are not needed just to start the processes or open `/` and `/healthz`.
- **Use Firebase sign-in, protected client sessions, and Firebase-token API verification:** fill the Firebase browser settings below and configure Firebase Admin credentials for both services. A running health endpoint does not confirm that authentication is configured.

#### `client/.env.local`

| Variable | Required for | Local value / how to obtain it |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Local client | `http://localhost:3000` |
| `NEXT_PUBLIC_SERVER_API_ORIGIN` | Calls from client to FastAPI | `http://localhost:8000` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase browser sign-in | Firebase Console → Project settings → General → Your apps → select the Web app → copy `apiKey`. Register a Web app there first if the project has none. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase browser sign-in | Copy `authDomain` from that Web app's Firebase configuration. It is commonly `<project-id>.firebaseapp.com`; use the Console value if a custom domain is configured. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase browser sign-in and Admin project selection | Copy `projectId` from the same Web app configuration. It should match the Firebase project used by the server. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase browser configuration | Copy `storageBucket` from the Web app configuration. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase browser configuration | Copy `messagingSenderId` from the Web app configuration. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase browser sign-in | Copy `appId` from the Web app configuration. |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Analytics only | Copy `measurementId` if Firebase Analytics is enabled for the Web app. This field is optional for sign-in. |

These `NEXT_PUBLIC_` values are included in browser code; they are Firebase's public web-app configuration, not admin secrets. After setting them, enable the sign-in providers the app offers in Firebase Console → Authentication → Sign-in method, and add `localhost` under Authentication → Settings → Authorized domains. Provider-specific OAuth setup (for example, Google or GitHub client credentials) is configured with that provider in Firebase Console, not in these environment files.

The client also needs Firebase Admin credentials when it creates or verifies its protected session cookie. Set **one** of these credential methods in `client/.env.local`:

| Method | Variables | How to get/configure it |
| --- | --- | --- |
| Application Default Credentials (recommended for local development) | `GOOGLE_APPLICATION_CREDENTIALS` | Set it to the absolute path of a Firebase/Google service-account JSON file available on this machine. Alternatively, run `gcloud auth application-default login` and leave this variable blank; make sure the signed-in identity has the Firebase Authentication permissions required by the Admin SDK. |
| Explicit Firebase Admin service-account fields | `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | In Firebase Console → Project settings → Service accounts → Firebase Admin SDK, generate/download a private key JSON. Copy `project_id`, `client_email`, and `private_key` into these fields. Keep newline markers as literal `\\n` if entering the private key on one line. Set all three fields together. |

Keep the JSON file outside the repository, restrict access to it, and never commit it or paste its private key into a `NEXT_PUBLIC_` variable. If both credential methods are configured, the explicit `FIREBASE_ADMIN_*` fields take precedence in the client.

#### `server/.env`

| Variable | Required for | Local value / how to obtain it |
| --- | --- | --- |
| `APPLICATION_ENV` | Server mode | Use `development` locally. |
| `SERVER_ALLOWED_CLIENT_ORIGINS` | Browser calls to FastAPI | Use `http://localhost:3000` locally. For multiple origins, separate them with commas. |
| `FIREBASE_PROJECT_ID` | Firebase Admin project selection | Recommended: use the same project ID as `NEXT_PUBLIC_FIREBASE_PROJECT_ID`; find it in Firebase Console → Project settings → General. If blank, `FIREBASE_ADMIN_PROJECT_ID` must provide the project ID instead. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firebase Admin authentication when using ADC | Use the same secured absolute JSON-file path as the client, or leave blank when using `gcloud auth application-default login`. |
| `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | Alternative Firebase Admin authentication | Use the same service-account JSON fields as the client. Set all three or leave all three blank. |
| `FIREBASE_ADMIN_CREDENTIALS_FILE` | Docker credential overlay only | Optional. Used only by `docker-compose.credentials.example.yml` to mount a key file into containers. The direct local startup scripts do not need it. |

The Admin SDK credential method is needed to verify Firebase ID tokens on protected API routes; the `/healthz` route itself does not need it. For direct local development, put the chosen Admin credential method in **both** `client/.env.local` and `server/.env`, since Next.js and FastAPI are separate processes. Use `FIREBASE_ADMIN_PROJECT_ID` consistently with the browser project ID. Never check real values into Git.

`PORT` is assigned by Docker/Cloud Run (and the local scripts use ports 3000 and 8000); do not add it to these files for local startup. `NODE_ENV` is managed by Next.js. `WIF_PROVIDER`, `GCP_PROJECT_ID`, and the other deployment variables later in this runbook are for GitHub Actions/Cloud Run deployment, not local startup.

Before testing the full local authentication flow, confirm each item:

- [ ] `client/.env.local` has both local URLs and all Firebase Web app values except the optional Analytics measurement ID.
- [ ] `client/.env.local` has one working Firebase Admin credential method.
- [ ] `server/.env` has `APPLICATION_ENV=development`, `SERVER_ALLOWED_CLIENT_ORIGINS=http://localhost:3000`, and the same Firebase project ID.
- [ ] `server/.env` has one working Firebase Admin credential method matching the client configuration.
- [ ] The intended Firebase Authentication provider is enabled, and `localhost` is an authorized domain.
- [ ] Node and Python dependencies have been installed, and the startup script reports both health endpoints ready.

If you only need to verify the UI and health endpoints, the Firebase values and credential checklist items can remain unset; Firebase sign-in and protected routes will not work until they are configured.

### Required runtime contracts

1. The client listens on the port passed through the PORT environment variable.
2. FastAPI/Uvicorn listens on 0.0.0.0 and the PORT environment variable.
3. Both applications expose GET /healthz, returning 200 without user authentication, database writes, or third-party calls.
4. FastAPI verifies Firebase ID tokens and authorizes every operation. Never trust a user ID or role supplied by the browser.
5. Use Cloud Run runtime service accounts and Application Default Credentials where possible. Do not put a Firebase service-account JSON file in the image.
6. The browser calls the FastAPI API domain directly. FastAPI CORS allows only the production client domain and local development origin.
7. Browser-visible Firebase configuration is public configuration. All server-only credentials live in Secret Manager, not in GitHub variables, source code, images, or browser storage.

## Step 2 — choose project and region

Use the existing Google Cloud project that owns Firebase Authentication and Firestore. Do not create a second project.

Before selecting a region, inspect the Firestore database location in Firebase Console or Google Cloud Console. Choose the closest compatible Cloud Run region and use that same region for Artifact Registry.

In PowerShell, install the Google Cloud CLI, authenticate with an administrator identity, then run:

~~~powershell
$ProjectId = "YOUR_EXISTING_FIREBASE_PROJECT_ID"
$Region = "YOUR_CHOSEN_CLOUD_RUN_REGION"
$GitHubRepository = "GITHUB_OWNER/GITHUB_REPOSITORY"
gcloud auth login
gcloud config set project $ProjectId
$ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
~~~

Record the project ID, project number, region, GitHub repository name, planned client domain, and planned API domain.

## Step 3 — enable services and create the image registry

~~~powershell
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com cloudresourcemanager.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories create bayes-containers --repository-format=docker --location=$Region --description="Bayes Learning Platform runtime images"
~~~

After the first successful deployment, set an Artifact Registry cleanup policy through the Google Cloud Console:

1. Open Artifact Registry, select bayes-containers, and select Edit Repository.
2. Add a dry-run policy that keeps the 10 most recent versions of each image.
3. Inspect the dry-run result after a day.
4. Change the policy to active deletion only when it preserves the revisions needed for rollback.

[Artifact Registry cleanup guidance](https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy-overview)

## Step 4 — create least-privilege runtime identities

The applications must not run as the GitHub deployer or the default Compute Engine service account.

~~~powershell
gcloud iam service-accounts create bayes-client-runtime --display-name="Bayes client Cloud Run runtime"
gcloud iam service-accounts create bayes-server-runtime --display-name="Bayes server Cloud Run runtime"
$ClientRuntimeSa = "bayes-client-runtime@$ProjectId.iam.gserviceaccount.com"
$ServerRuntimeSa = "bayes-server-runtime@$ProjectId.iam.gserviceaccount.com"
~~~

Initially, client should receive no broad project permission. If FastAPI reads or writes Firestore, grant only its runtime account Firestore user access:

~~~powershell
gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$ServerRuntimeSa" --role="roles/datastore.user"
~~~

When a real secret is introduced, create it in Secret Manager and grant the required runtime account access to that one secret:

~~~powershell
gcloud secrets add-iam-policy-binding YOUR_SECRET_NAME --member="serviceAccount:$ServerRuntimeSa" --role="roles/secretmanager.secretAccessor"
~~~

Attach a secret to the service only after granting that access:

~~~powershell
gcloud run services update bayes-server --region=$Region --update-secrets=APP_SETTING=YOUR_SECRET_NAME:latest
~~~

Use a version number instead of latest for a configuration change that must be fully reproducible. Do not grant Owner, Editor, broad Secret Manager access, or a downloaded private key to either runtime account.

## Step 5 — create the GitHub deployment identity

Create one deployment-only identity. It can deploy Cloud Run services, push images, and attach the two designated runtime identities. It cannot access application secrets or Firestore data.

~~~powershell
gcloud iam service-accounts create bayes-github-deployer --display-name="GitHub Actions Cloud Run deployer"
$DeployerSa = "bayes-github-deployer@$ProjectId.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$DeployerSa" --role="roles/run.admin"
gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$DeployerSa" --role="roles/artifactregistry.writer"
gcloud iam service-accounts add-iam-policy-binding $ClientRuntimeSa --member="serviceAccount:$DeployerSa" --role="roles/iam.serviceAccountUser"
gcloud iam service-accounts add-iam-policy-binding $ServerRuntimeSa --member="serviceAccount:$DeployerSa" --role="roles/iam.serviceAccountUser"
~~~

## Step 6 — trust this GitHub repository through OIDC

Run the following once. The repository condition is important: it prevents another GitHub repository from using this deployment identity.

~~~powershell
$PoolId = "github-actions"
$ProviderId = "github"
gcloud iam workload-identity-pools create $PoolId --location="global" --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc $ProviderId --location="global" --workload-identity-pool=$PoolId --display-name="Bayes GitHub repository" --issuer-uri="https://token.actions.githubusercontent.com/" --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" --attribute-condition="assertion.repository=='$GitHubRepository'"
$WifPrincipal = "principalSet://iam.googleapis.com/projects/$ProjectNumber/locations/global/workloadIdentityPools/$PoolId/attribute.repository/$GitHubRepository"
gcloud iam service-accounts add-iam-policy-binding $DeployerSa --role="roles/iam.workloadIdentityUser" --member=$WifPrincipal
~~~

GitHub's temporary OIDC token becomes a short-lived Google credential at workflow runtime. There is no static credential to rotate or accidentally commit. [Google Workload Identity Federation guidance](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)

## Step 7 — add GitHub configuration

In GitHub, open Settings → Secrets and variables → Actions → Variables. Add the following variables:

| Variable | Value |
| --- | --- |
| GCP_PROJECT_ID | Existing Firebase/Google project ID |
| GCP_REGION | Chosen Cloud Run region |
| WIF_PROVIDER | Full workload identity provider path created above |
| GCP_DEPLOYER_SERVICE_ACCOUNT | The bayes-github-deployer service-account email |
| CLIENT_ORIGIN | Production client origin, for example https://client.example.com |
| SERVER_ORIGIN | Production FastAPI origin, for example https://api.example.com |
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebase browser configuration value |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Firebase browser configuration value |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Firebase browser configuration value |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | Firebase browser configuration value |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Firebase browser configuration value |
| NEXT_PUBLIC_FIREBASE_APP_ID | Firebase browser configuration value |
| NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID | Firebase browser configuration value |

These are identifiers, not secrets. Do not add GOOGLE_CREDENTIALS JSON as a GitHub secret.

Create a GitHub Environment named production. Before real users rely on the platform, configure it with required reviewer approval. That makes every production deployment deliberate while retaining automatic CI.

## Step 8 — add CI

CI runs checks only. Require it to pass before a pull request can merge to main.

~~~yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  client:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: client
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: client/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
  server:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: server
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: python -m pip install --upgrade pip
      - run: pip install -r requirements.txt
      - run: pytest
~~~

Change the Python commands to match the selected FastAPI tooling after refactoring. Pull-request CI must not build registry images, deploy preview services, or hold Google credentials.

## Step 9 — add CD

The committed [production deployment workflow](../.github/workflows/deploy-production.yml) runs only after CI succeeds for a `push` to this repository's `main` branch. It validates the required GitHub Actions variables, authenticates with Workload Identity Federation, builds SHA-tagged images, deploys the server before the client, and checks both `/healthz` endpoints. It serializes deployments so a newer release cannot be superseded midway through an earlier one.

The public invocation flag is deliberate: a browser cannot use Firebase ID tokens as Cloud Run IAM invocation tokens. The services remain secure only when the application checks Firebase credentials, roles, ownership, Firestore Rules, App Check, input validation, CORS, and rate limits. Public invocation never means public data.

The service configuration in this workflow is the deployment source of truth. GitHub Environment protection for `production` applies before deployment. [Google's Cloud Run GitHub deploy action](https://github.com/google-github-actions/deploy-cloudrun)

## Step 10 — deploy and verify

1. Merge a passing CI build into main.
2. Approve the production Environment deployment when prompted.
3. Confirm there are exactly two services:

~~~powershell
gcloud run services list --region=$Region
gcloud run services describe bayes-client --region=$Region
gcloud run services describe bayes-server --region=$Region
~~~

4. Test their generated run.app addresses:

~~~powershell
$ClientUrl = gcloud run services describe bayes-client --region=$Region --format="value(status.url)"
$ServerUrl = gcloud run services describe bayes-server --region=$Region --format="value(status.url)"
Invoke-WebRequest "$ClientUrl/healthz"
Invoke-WebRequest "$ServerUrl/healthz"
~~~

5. Test client sign-in; server rejection without a bearer token; server authorization with a valid token; Firestore Rules; App Check; CORS; logs; and error reporting.
6. Confirm that both services use request-based billing, service-level minimum zero, and maximum three.
7. Only after the run.app URLs pass, add the client and API custom domains through the chosen Cloudflare/Cloud Run domain setup. Keep client and API on separate hostnames, and bypass Cloudflare caching for authenticated HTML and all API paths.

## Roll back safely

Cloud Run keeps each deployment as a revision. If deployment or smoke testing fails, send traffic back to the known-good revision:

~~~powershell
gcloud run revisions list --service=bayes-client --region=$Region
gcloud run revisions list --service=bayes-server --region=$Region
gcloud run services update-traffic bayes-client --region=$Region --to-revisions=KNOWN_GOOD_CLIENT_REVISION=100
gcloud run services update-traffic bayes-server --region=$Region --to-revisions=KNOWN_GOOD_SERVER_REVISION=100
~~~

Never roll back by overwriting a latest image tag. The SHA tag and Cloud Run revision identify the exact code being restored.

## Cost controls that remain mandatory

- Both services stay at minimum zero until real latency measurements justify warming client.
- Keep maximum instances at three until load testing demonstrates a safe reason to raise it.
- Build images only on main after CI passes.
- Apply an Artifact Registry cleanup policy after a dry run.
- Do not introduce a VPC connector, Cloud SQL, a warm instance, a server-side media proxy, or instance-based billing without a measured requirement.
- Set Cloud Billing alerts at $1, $5, and $20. Where available, configure a Cloud Billing Budget spend cap for Cloud Run and understand that it can make both services unavailable when reached.
- Monitor private-repository GitHub Actions minutes.
- Review production dependency audits before launch. Do not apply an automated downgrade merely because an audit tool suggests one; validate the upstream advisory and supported upgrade path first.

## Done definition

- [ ] The refactor creates independently runnable client and server containers.
- [ ] Artifact Registry and the two least-privilege runtime accounts exist.
- [ ] GitHub OIDC/WIF is limited to this repository; no Google key is stored in GitHub.
- [ ] CI is required before merge.
- [ ] CD deploys only SHA-tagged client and server images from main.
- [ ] bayes-client and bayes-server are request-based, minimum zero, maximum three, and expose passing health checks.
- [ ] Firebase Auth, App Check, FastAPI authorization, Firestore Rules, CORS, logs, rollback, and billing alerts have been tested.
