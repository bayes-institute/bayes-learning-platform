# Client architecture

- Keep `app/` focused on routing and route composition; pages should compose code from `features/<capability>/` rather than own feature behavior.
- Colocate a feature's components, hooks, API clients, schemas, state, types, and styles. Feature tests are optional; create shared components or hooks only for a clear cross-feature role.
- Split components by semantic UI responsibility when cognitive complexity grows; do not extract meaningless wrappers merely to reduce line count.
- Prefer colocated CSS Modules for feature styles. Use global CSS only for application-wide foundations. Keep client/server component boundaries explicit and limit client components to interactive leaves.
