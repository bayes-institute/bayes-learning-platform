# Next steps

**Current architecture decision — 2 October 2026**

```text
Cloudflare
  ├─ client.<domain>  → Cloud Run `client` (Next.js, min instances = 0)
  └─ api.<domain>     → Cloud Run `server` (FastAPI, min instances = 0)

Firebase Authentication + Firestore remain the identity and primary data layer.
```

`client` and `server` are independent Cloud Run **services**, not permanently running VM instances. Both scale to zero. They consume the same Cloud Run free allowance at the billing-account level.

## Before deployment

- [ ] Confirm the existing Firestore database location, then select the closest compatible Cloud Run region. Do not choose a region before checking this.
- [ ] Link the Firebase project to the required Google Cloud billing account (Blaze) and set budget alerts/spend controls.
- [ ] Register or confirm the production domain and add it to Cloudflare.
- [ ] Create the `client` deployment configuration for the current Next.js application.
- [ ] Create the `server` FastAPI project with `/healthz`, structured error responses, and Firebase ID-token verification middleware/dependency.
- [ ] Define separate Cloud Run service accounts with least privilege; do not reuse a developer account at runtime.
- [ ] Store Firebase Admin credentials and future media-provider secrets in Google Secret Manager; remove all production secrets from local deployment configuration.

## Cloud Run launch configuration

- [ ] `client`: request-based billing, `min instances=0`, `max instances=3`, begin with 1 vCPU / 512 MiB and measure memory/latency.
- [ ] `server`: request-based billing, `min instances=0`, `max instances=3`, begin with a conservative container size and measure it independently.
- [ ] Add Cloud Run service-level maximum instances before the services are public.
- [ ] Attach `client.<domain>` to the Next service and `api.<domain>` to FastAPI; do not proxy every API request through Next.
- [ ] Configure CORS on FastAPI to allow only the production and local-development client origins.
- [ ] Verify deployment rollback and logs before launch.

## Firebase and application security

- [ ] Review Firebase Authentication providers and allowed redirect domains.
- [ ] Write and emulator-test Firestore Security Rules before exposing any direct client reads/writes.
- [ ] Enable and enforce Firebase App Check for browser-facing Firebase services.
- [ ] Make FastAPI verify Firebase bearer tokens and authorize every requested resource server-side.
- [ ] Define role/entitlement claims and the procedure for changing them; clients must never assign their own role.
- [ ] Add rate limits/Turnstile where forms or unauthenticated endpoints can be abused.

## Cost controls and performance baseline

- [ ] Enable Cloud Billing alerts at $1, $5 and $20.
- [ ] Where available, configure a Cloud Billing Budget spend cap for Cloud Run; understand its outage behaviour before relying on it.
- [ ] Enable Cloudflare caching only for public immutable assets and public course content. Bypass authenticated HTML and `/api/*`.
- [ ] Record client/server cold-start, p50 and p95 latency after the first test deployment.
- [ ] Keep both services at `min=0` initially. Consider warming only `client` if measured cold starts harm the learner experience.
- [ ] Do not add video, R2 or Realtime Database before the associated feature exists.

## Product/data design — next planning session

- [ ] Fill in [FIRESTORE_DATA_MODEL.md](FIRESTORE_DATA_MODEL.md) from the agreed course, lesson, quiz, enrolment, progress and role requirements.
- [ ] Map every screen to its read/write operations before fixing Firestore collections or indexes.
- [ ] Identify public/cacheable content versus per-user/protected content.
- [ ] Decide which mutations are direct Firestore writes and which must go through FastAPI.
- [ ] Estimate document reads/writes for a representative learner session and validate against Firestore quotas.

## Deferred until required

- [ ] Bunny Stream for on-demand course video.
- [ ] Cloudflare R2 for binary/non-video uploads and downloads.
- [ ] Firebase Realtime Database only for genuine ephemeral presence/live state.
- [ ] A warm Cloud Run instance, after latency measurements justify its recurring cost.
