## Public-route and cost review

- [ ] This change adds no public route or changes no route's downstream cost profile.
- [ ] Each added or changed public route is classified below before deployment.

| Route | Class (Cheap / Identity / Learner read / Learner write / Expensive) | Controls and cost estimate |
| --- | --- | --- |
| _None_ | _N/A_ | _N/A_ |

For an **Expensive** route, also confirm all of the following before approval:

- [ ] Firebase authentication, server-side authorization, and verified email are required.
- [ ] Per-user/day quota, bounded request body, short timeout, concurrency cap, and audit event are implemented and tested.
- [ ] The product owner approved the expected cost.

For a **Learner write** route, also confirm idempotency or an attempt constraint, an ownership check, a per-user limit, and bounded document reads/writes.
