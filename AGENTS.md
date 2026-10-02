# Git workflow

- Keep `main` deployable: develop on short-lived branches, merge through pull requests, and trigger production deployments from `main` unless a workflow targets another environment. Treat broken `main` as an incident.
- Branches describe work, not sequence. Use `<type>/<domain>/<description>`, where type is `feat`, `fix`, `refactor`, `perf`, `test`, `chore`, `docs`, `infra`, or `build`. For example: `feat/video-streaming/player`, `feat/auth/session-refresh`, `fix/video-streaming/stale-buffer`, `refactor/payments/checkout`, `chore/ci/cache-dependencies`, or `infra/aws/private-networking`.
- Name branches for the capability, even when work spans `client/` and `server/`. Add `-client` or `-api` only when those changes are intentionally independent.
- Keep names semantic for parallel or stacked work; express dependencies through PRs and base branches, not numbering.
- Normally branch from the latest `main`; avoid long-lived integration branches unless a release or organizational need requires one.

# Code organization

- Organize application code by capability, not technical layer. Colocate a capability's behavior, contracts, and integrations.
- Start code in its owning feature. Promote it to shared/platform code only for a stable, clearly named cross-feature responsibility; never create generic `utils`, `helpers`, `common`, or `misc` dumping grounds.
- Keep dependencies directional: UI/route boundary -> feature logic -> repository/integration. Avoid circular feature dependencies.
- Prefer domain-specific names and errors over generic verbs or types. Refactor for cognitive complexity and mixed responsibilities, not line count alone.
- Colocate behavior tests with a feature when useful; top-level tests are also valid, especially for system or end-to-end behavior. Comments explain non-obvious why, constraints, or invariants.
