# Server architecture

- Keep `app/main.py` composition-only: create the app, register middleware/handlers, initialize infrastructure, and include routers. Do not put business behavior there.
- Use `app/features/<capability>/` for capability code. Add only needed modules such as `router.py`, `service.py` or named use cases, `repository.py`, `schemas.py`, `models.py`, `dependencies.py`, and `errors.py`; feature tests are optional.
- Routers parse and authorize requests, call a feature service/use case, and translate results to HTTP. Keep business workflows out of handlers.
- Keep feature contracts and persistence code with their feature. Put genuine cross-feature infrastructure in `app/platform/` under a concrete name.
- Make persistence a repository/integration behind feature services. API schemas must describe domain operations rather than database-provider records, queries, or identifiers so a provider can be replaced without changing client contracts.
