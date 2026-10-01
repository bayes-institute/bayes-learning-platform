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

This workflow runs only after the CI workflow succeeds for code on main. It creates SHA-tagged images, deploys both services with the selected zero-minimum policy, then checks both health endpoints. This dependency is important: two unrelated workflows triggered by the same push can otherwise run at the same time.

~~~yaml
# .github/workflows/deploy-production.yml
name: Deploy production
on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]
concurrency:
  group: production-deployment
  cancel-in-progress: false
permissions:
  contents: read
  id-token: write
env:
  PROJECT_ID: ${{ vars.GCP_PROJECT_ID }}
  REGION: ${{ vars.GCP_REGION }}
  WIF_PROVIDER: ${{ vars.WIF_PROVIDER }}
  DEPLOYER_SERVICE_ACCOUNT: ${{ vars.GCP_DEPLOYER_SERVICE_ACCOUNT }}
  CLIENT_ORIGIN: ${{ vars.CLIENT_ORIGIN }}
  SERVER_ORIGIN: ${{ vars.SERVER_ORIGIN }}
  NEXT_PUBLIC_FIREBASE_API_KEY: ${{ vars.NEXT_PUBLIC_FIREBASE_API_KEY }}
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ vars.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ vars.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ vars.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ vars.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
  NEXT_PUBLIC_FIREBASE_APP_ID: ${{ vars.NEXT_PUBLIC_FIREBASE_APP_ID }}
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: ${{ vars.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }}
  DEPLOY_SHA: ${{ github.event.workflow_run.head_sha }}
  REPOSITORY: bayes-containers
jobs:
  deploy:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
      - uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: ${{ env.WIF_PROVIDER }}
          service_account: ${{ env.DEPLOYER_SERVICE_ACCOUNT }}
      - uses: google-github-actions/setup-gcloud@v2
      - name: Build, push, deploy, and smoke test
        shell: bash
        run: |
          set -euo pipefail
          REGISTRY="${REGION}-docker.pkg.dev"
          CLIENT_IMAGE="${REGISTRY}/${PROJECT_ID}/${REPOSITORY}/client:${DEPLOY_SHA}"
          SERVER_IMAGE="${REGISTRY}/${PROJECT_ID}/${REPOSITORY}/server:${DEPLOY_SHA}"
          gcloud auth configure-docker "${REGISTRY}" --quiet
          docker build --tag "${CLIENT_IMAGE}" --build-arg NEXT_PUBLIC_SITE_URL="${CLIENT_ORIGIN}" --build-arg NEXT_PUBLIC_SERVER_API_ORIGIN="${SERVER_ORIGIN}" --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="${NEXT_PUBLIC_FIREBASE_API_KEY}" --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}" --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}" --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}" --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="${NEXT_PUBLIC_FIREBASE_APP_ID}" --build-arg NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="${NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}" ./client
          docker push "${CLIENT_IMAGE}"
          docker build --tag "${SERVER_IMAGE}" ./server
          docker push "${SERVER_IMAGE}"
          gcloud run deploy bayes-client --image "${CLIENT_IMAGE}" --region "${REGION}" --service-account "bayes-client-runtime@${PROJECT_ID}.iam.gserviceaccount.com" --min 0 --max 3 --cpu 1 --memory 512Mi --concurrency 40 --cpu-boost --ingress all --allow-unauthenticated
          gcloud run deploy bayes-server --image "${SERVER_IMAGE}" --region "${REGION}" --service-account "bayes-server-runtime@${PROJECT_ID}.iam.gserviceaccount.com" --min 0 --max 3 --cpu 1 --memory 512Mi --concurrency 20 --cpu-boost --ingress all --allow-unauthenticated --set-env-vars "APPLICATION_ENV=production,SERVER_ALLOWED_CLIENT_ORIGINS=${CLIENT_ORIGIN},FIREBASE_PROJECT_ID=${PROJECT_ID}"
          CLIENT_URL="$(gcloud run services describe bayes-client --region "${REGION}" --format='value(status.url)')"
          SERVER_URL="$(gcloud run services describe bayes-server --region "${REGION}" --format='value(status.url)')"
          curl --fail --retry 3 "${CLIENT_URL}/healthz"
          curl --fail --retry 3 "${SERVER_URL}/healthz"
~~~

The public invocation flag is deliberate: a browser cannot use Firebase ID tokens as Cloud Run IAM invocation tokens. The services remain secure only when the application checks Firebase credentials, roles, ownership, Firestore Rules, App Check, input validation, CORS, and rate limits. Public invocation never means public data.

Do not add this workflow until the Step 1 folders and health routes exist. The service configuration in this workflow is the initial source of truth. [Google's Cloud Run GitHub deploy action](https://github.com/google-github-actions/deploy-cloudrun)

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
