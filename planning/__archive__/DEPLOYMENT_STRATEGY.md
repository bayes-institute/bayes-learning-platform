# Deployment strategy and cost guardrails

**Decision date:** 2 October 2026  
**Prices:** USD, before local tax, domain registration, and any payment-processing or email provider charges. Provider pricing changes; recheck the linked primary sources before enabling a paid feature.

## Recommendation in one sentence

Use **two Cloud Run services**, both with **`min instances = 0`**: `client` for the existing server-rendered Next.js application and `server` for FastAPI. Keep Firebase Authentication and Firestore, use Cloudflare's free DNS/CDN layer for public cacheable content, and add **Bunny Stream only when course video actually launches**.

This is the best practical low-cost path, rather than the theoretical maximum-free path. At the expected 10--15 active users it should be **$0/month for cloud services** (plus the domain), provided usage stays inside the included quotas. It remains simple enough to run when the product succeeds.

## Important clarification: static UI versus serverless UI

The current repository deliberately requires a Node-capable server: `/learn` verifies an HttpOnly Firebase session cookie on the server, and `/api/auth/session` creates it. It cannot currently be exported as a static site. That does **not** mean it needs an always-on server.

Cloud Run runs a normal container (Node or Python) and, with request-based billing and `min instances = 0`, scales to zero between requests. Its always-free request-based allowance is 2 million requests, 180,000 vCPU-seconds, and 360,000 GiB-seconds each month; charges are rounded to 100 ms. [Cloud Run pricing](https://cloud.google.com/run/pricing)

Cloudflare Pages remains a good future option *only if* we deliberately redesign the frontend to be static/client-rendered and move the session boundary to an API. It is not a prerequisite for the recommended design. Cloudflare Workers are excellent for edge routing, lightweight authorization and caching, but are not a natural host for a conventional FastAPI process.

## Recommended target architecture

```text
Browser
  |
  +-- Cloudflare Free: DNS, TLS, DDoS protection, CDN cache
  |       |-- cache only public, immutable assets and public course pages
  |       `-- never cache /api, authenticated HTML, or learner data
  |
  +-- Cloud Run: client (current Next.js server, min=0)
  |       `-- Firebase Admin verifies the existing session cookie
  |
  +-- Cloud Run: server (FastAPI, min=0)
  |       `-- verifies Firebase ID token; runs privileged/transactional work
  |
  +-- Firebase Authentication + Firestore
  |       `-- direct, security-rule-protected reads/listeners where appropriate
  |
  `-- Browser-direct upload/playback
          `-- Bunny Stream for course video (when launched)
              or Cloudflare R2 for non-video files
```

Keep Cloud Run in the same Google geography as the existing Firestore database where possible. The Firestore location cannot be changed in place, so the existing database's location should drive the region choice. Do not route a video through FastAPI or Cloud Run: the browser uploads directly using a short-lived, scoped upload credential and plays directly from the media CDN.

### What belongs where

| Concern | Preferred home | Why |
| --- | --- | --- |
| Marketing pages, app shell, JS, fonts, images | Cloudflare cache in front of Next; immutable assets get long cache lifetimes | Avoids Cloud Run work on cache hits. |
| Current server-rendered `/learn` and session route | `client`: Next.js on Cloud Run | Preserves the security model already in this repository. |
| Course catalogue that is public and changes rarely | Statically generated/cached JSON or pages | Make content versioned and cacheable rather than fetching it on every navigation. |
| Learner progress and ordinary user-scoped reads | Firestore directly from the Firebase client SDK, protected by Firestore Rules | Avoids putting a paid server in front of every read. |
| Grading finalization, entitlements, admin publishing, payment webhooks, bulk jobs, signed media credentials | `server`: FastAPI on Cloud Run | These require trusted server authority, idempotency, and auditability. |
| Presence only (typing/online status, if ever needed) | Firebase Realtime Database | Firestore already has real-time listeners; do not add RTDB for ordinary course/progress state. |
| Video | Bunny Stream | Video-specific upload, transcoding/HLS, player and CDN keep video traffic off compute. |
| PDFs, downloadable workbooks, images, other objects | Cloudflare R2 at first | S3-compatible storage with no egress charge; use browser-direct signed uploads. |

## Compute vendor comparison

| Vendor / product | Prototype economics | Fit for this product | Verdict |
| --- | --- | --- | --- |
| **Google Cloud Run** | Always-free monthly pool: 2M requests, 240k vCPU-s, 450k GiB-s; then pay only while requests run. | Normal Next.js and FastAPI containers, scales to zero, native Firebase/Firestore proximity. | **Choose this.** |
| Cloudflare Workers | Free: 100,000 requests/day, 10 ms CPU per invocation. Standard includes 10M requests/month and 30M CPU-ms, but is a separate paid Workers plan. [Pricing](https://developers.cloudflare.com/workers/platform/pricing/) | Great edge complement; a poor replacement for a conventional FastAPI server. | Use selectively for edge concerns, not the core Python API. |
| AWS Lambda + API Gateway | Lambda includes 1M requests and 400,000 GB-s/month. [Pricing](https://aws.amazon.com/lambda/pricing/) | Works with an adapter, but API Gateway, IAM, logs, regions and cross-cloud Firestore traffic increase complexity. | Good AWS-native alternative, not the lowest-friction choice. |
| DigitalOcean App Platform | A running 512 MiB shared container starts at **$5/month**; only static sites are free. [Pricing](https://www.digitalocean.com/pricing/app-platform) | Very simple PaaS, but it is a fixed floor even with no traffic. | Prefer only when $5 predictable hosting is worth more than scale-to-zero. |
| Oracle Cloud Always Free VM | ARM allowance is equivalent to 2 OCPUs and 12 GB RAM, continuously free. [Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) | The most generous raw free compute, but it is a self-managed VM: patches, monitoring, backups, capacity availability and deployments become our job. | Useful hobby fallback; not the default production platform. |
| IBM Cloud Code Engine | Scales to zero and has a free tier. [Pricing](https://cloud.ibm.com/docs/codeengine?topic=codeengine-pricing) | Container-friendly, but adds a second cloud next to Firebase without a compensating benefit here. | Viable, but no reason to prefer it. |

The meaningful result is not that Cloud Run has the largest raw free machine. Oracle does. It is that Cloud Run is the best **zero-traffic-cost, production-shaped** choice for a Firebase-backed Python/Next application.

## CDN and media choice

Use different tools for different traffic; a general CDN is not automatically a video platform.

| Workload | Recommended service | Cost position / rationale |
| --- | --- | --- |
| Website assets and public cacheable responses | Cloudflare Free | Keep the DNS zone proxied; cache immutable static assets aggressively. It is already the most sensible no-fixed-cost edge layer. |
| Binary assets / user files | Cloudflare R2 | Includes 10 GB-month storage, 1M write-class and 10M read-class operations monthly, and has no Internet egress fee. [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| On-demand teaching video | **Bunny Stream** | This is likely the inexpensive video service you remember. It starts at $0.005/GB; its Volume tier is $5/TB delivered. [Bunny Stream](https://bunny.net/stream/) [Volume tier](https://docs.bunny.net/stream/storage-tiers) |
| Alternative integrated video service | Cloudflare Stream | Worth evaluating only if its workflow/pricing is preferable at the actual viewing minutes. Do not assume R2 alone supplies transcoding, adaptive HLS, player features, or video access controls. |
| AWS-only CDN option | CloudFront | Its current free plan advertises 100 GB and 1M requests/month, but would make sense chiefly if the origin is already in AWS. [CloudFront plans](https://aws.amazon.com/cloudfront/pricing/) |

For initial video, use Bunny Stream's signed-token capability or a short-lived server-issued playback token; do not publish an unrestricted origin URL. Do not pre-purchase Bunny until the first video course is ready. Bunny Storage has a $1 monthly minimum, so it is inexpensive but not literally a permanent $0 service. [Bunny Storage pricing](https://bunny.net/pricing/storage/)

## Firebase plan and real-time data

The project will need a linked Google Cloud billing account (Firebase Blaze) to use Cloud Run. Blaze does **not** automatically create a bill: it preserves product free quotas and bills only excess use.

Firestore's no-cost daily quota is 50,000 document reads, 20,000 writes, and 20,000 deletes, plus 1 GiB stored and 10 GiB/month outbound transfer for one free database. [Firestore pricing](https://firebase.google.com/docs/firestore/pricing) At 15 active learners, this is ample if the data model is disciplined.

Realtime Database is optional. On Spark, or as the included allowance on Blaze, it provides 1 GB stored and 10 GB/month downloaded. [Realtime Database billing](https://firebase.google.com/docs/database/usage/billing) Use it only for ephemeral presence/live state. Firestore's real-time listeners are enough for progress, quiz state and course updates; every document delivered by a listener is still a billable Firestore read.

Firebase Authentication with social providers, App Check, Remote Config, Crashlytics and FCM are useful no-cost tools. Enable App Check before direct database access becomes broadly public. [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)

## A realistic prototype cost model

Assumption: 15 daily active learners, 20 sessions each/month (300 sessions); each session produces 30 server requests averaging 200 ms with 1 vCPU/512 MiB allocation, and 100 Firestore reads.

| Resource | Approximate monthly use | Included amount | Expected charge |
| --- | ---: | ---: | ---: |
| Cloud Run client + server | 9,000 requests; about 1,800 vCPU-s and 900 GiB-s | 2M; 180k vCPU-s; 360k GiB-s | **$0** |
| Firestore | 30,000 reads/month; modest writes | 50k reads/day; 20k writes/day | **$0** |
| RTDB | None unless presence is built | 1 GB / 10 GB downloads | **$0** |
| Cloudflare DNS/CDN | Normal public web traffic | Free plan | **$0** |
| R2 | Up to 10 GB and normal prototype operations | Included monthly allowance | **$0** |
| Video | Not launched | Do not provision yet | **$0** |
| Domain | One annual registration | Registrar-dependent | Usually about $10--20/year |

**Budget to set aside now:** $0--2/month for cloud services, plus the domain. Keep a small prepaid balance only when enabling Bunny/video. If you choose DigitalOcean instead of Cloud Run, make the baseline **$5/month** before any traffic.

### The cost of eliminating most cold starts

With request-based billing, `min instances = 1` keeps one container warm. It removes the normal scale-from-zero startup delay for that service, but does not guarantee perfection: deployments, crashes, maintenance/restarts and traffic beyond the instance's concurrency can still require a new instance.

For a realistic 30-day, **1 vCPU / 512 MiB** service, the idle rate is $0.0000025 per vCPU-second and $0.0000025 per GiB-second. The raw warm cost is $6.48 CPU + $3.24 memory = **$9.72/month**. Cloud Run's request-based free-tier discount is worth about $5.22 at active Tier-1 prices (180k vCPU-s + 360k GiB-s), leaving approximately **$4.50/month** if this is the only warm service and low traffic. A 31-day month is slightly higher; active requests, egress and other Cloud Run services also draw from the same shared free allowance. [Cloud Run pricing](https://cloud.google.com/run/pricing)

Two continuously warm services (`client` and `server`) at that size are about **$14.22/month** after the single shared free-tier discount. Therefore, warm the user-facing Next service first if measurement justifies it; keep FastAPI at zero until an API cold start is proven to affect a critical interaction. Cloud Run may otherwise retain a zero-minimum idle instance for up to 15 minutes, so a cold start is not normally incurred between nearby requests. [Autoscaling and idle instances](https://cloud.google.com/run/docs/about-instance-autoscaling)

At larger usage, video delivery and Firestore reads—not FastAPI CPU—will likely become the first meaningful costs. For example, 1 TB/month of Bunny Volume video delivery is about $5, before video storage; this is why video must never traverse the API. The model above is an estimate, not a promise: Cloud Run egress, provider region, request duration, Firestore document shape and viewer watch-time are the variables that need measurement.

## Cost and security controls to configure on day one

1. Set Cloud Run to **request-based billing**, `min instances = 0`, a service-level `max instances = 3`, and conservative memory/CPU. Google explicitly recommends starting at a max of three as a cost safeguard. [Maximum instances](https://cloud.google.com/run/docs/configuring/max-instances) A max cap protects cost but can return errors under a spike; raise it only after observing load.
2. Create Google Cloud budget alerts at $1, $5 and $20, and an alert email that is monitored. Where available for this project, also configure a **Cloud Billing Budget spend cap** for Cloud Run: it pauses Cloud Run workloads when reached. Alerts alone are notifications, not a spending hard-stop, and a Cloud Run cap does not replace Firestore/RTDB usage alerts.
3. Put Cloudflare in front of public traffic, force HTTPS, enable its baseline DDoS controls, add Turnstile to abuse-prone forms, and use rate limits where they are justified. Bypass cache for every authenticated/API route.
4. Every FastAPI request must verify the Firebase ID token server-side, then authorize the requested resource; never accept a UID, role or price sent by the browser. Keep Firebase Admin/R2/Bunny secrets only in Cloud Run secret configuration.
5. Write Firestore Rules that enforce learner ownership and instructor/admin roles even if FastAPI is bypassed. Enable Firebase App Check and validate it on direct-client services.
6. Make mutations idempotent (especially quiz submission, enrolment and payments), use Firestore transactions for counters/progress decisions, and give documents a schema/version. These prevent duplicate writes and billing surprises.
7. Upload media browser-to-media-provider with size/type limits and short-lived credentials. FastAPI should issue the credential, not relay the file.

## Data and caching rules that reduce bills without weakening correctness

- Cache versioned course definitions, lesson text, thumbnails and static metadata in the CDN/browser. Store a `contentVersion` so a deploy/publish can invalidate deliberately.
- Persist only non-sensitive UI state locally: last course/lesson, query results with a TTL, navigation state and static content version. Never put Firebase Admin credentials, authorization decisions, raw session cookies or protected quiz answers in local storage.
- Let the browser hold its Firebase Auth session and Firestore's supported local cache; avoid polling. Use a listener only while a screen genuinely needs live updates, and unsubscribe on navigation.
- Fetch compact progress summaries, not every attempt/history record on the dashboard. Paginate histories and aggregate server-side only when needed.
- Do not make FastAPI a generic Firestore proxy. Each proxy request adds Cloud Run time and defeats client caching. Reserve it for rules the client must not be able to perform.
- Use HTTP `Cache-Control`, ETags and conditional requests for public API responses. Never cache responses containing a user's progress or authorization result in a shared CDN.

## Delivery sequence

### Phase 1 — launch safely at near-zero cost

1. Keep the current Next session model and deploy it as the `client` Cloud Run service (`min=0`, `max=3`).
2. Deploy FastAPI as the independent `server` Cloud Run service (`min=0`, `max=3`), with only a health route and Firebase-token verification at first.
2. Link billing, set alerts and service limits before exposing the public domain.
3. Put Cloudflare DNS/proxy in front; cache only immutable public assets/pages.
4. Use Firebase Auth, Firestore Rules, App Check and direct Firestore reads for normal learner state.
5. Do **not** add RTDB, R2 or Bunny until a concrete feature needs each one.

### Phase 2 — use the dedicated FastAPI boundary

Implement grading, publishing, payments, privileged administration, webhooks and signed media links in the existing `server` service as those features appear. It receives a Firebase bearer token, verifies it, applies business authorization, and writes the authoritative result. The `client` and `server` services share the same Cloud Run free allowance at the billing-account level, so this remains near zero at prototype traffic.

### Phase 3 — media and scale

Add Bunny Stream when course video is real. Measure delivered GB and average watch time first. Increase Cloud Run max instances, add a warm instance only when cold starts have demonstrated a real UX problem, and scale Firestore data modelling before adopting another database. A warm Cloud Run instance has idle cost; its default `min=0` is intentional. [Minimum instances](https://cloud.google.com/run/docs/configuring/min-instances)

## What not to do

- Do not split across five clouds at launch merely because each has a free tier. The debugging, IAM, egress and monitoring cost will exceed a dollar or two very quickly.
- Do not put every Firestore operation behind FastAPI.
- Do not use a permanent free VM as the primary production host just to avoid a small future bill.
- Do not run video, file uploads, image transforms or long background work through the web/API request path.
- Do not set `min instances = 1` while optimizing for $0; that deliberately keeps a billed process warm.

## Final choice

Start with **Cloud Run + Firebase + Cloudflare**. Run the frontend in the `client` Cloud Run service and FastAPI in the `server` Cloud Run service, both at zero minimum instances. FastAPI is the privileged business-logic API rather than a blanket Firestore relay. Add **Bunny Stream** only for video, and **R2** only for non-video object storage. This keeps the launch bill essentially at domain cost while leaving a clean, scalable path when learners arrive.
