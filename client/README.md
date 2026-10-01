# Bayes Learning Platform

A Next.js App Router learning platform with Firebase Authentication, a server-verified learning area, and the Bayes Institute design system.

## Service boundary

This folder is the independently deployable Next.js client service. It owns
interactive Firebase browser sign-in and the same-origin secure session cookie
used to protect server-rendered learning pages. In Cloud Run it uses the
assigned runtime service account through Application Default Credentials.

FastAPI is intentionally not proxied through this service. Browser requests to
the future API go directly to the sibling server service with a Firebase bearer
token; see the root README for the ownership model.

## Getting started

Requires Node.js 20.9 or newer.

Copy .env.example to .env.local. Set NEXT_PUBLIC_SITE_URL to the client origin and NEXT_PUBLIC_SERVER_API_ORIGIN to FastAPI. Firebase browser settings are public configuration. In Cloud Run, the client uses its assigned runtime service account; local development can use GOOGLE_APPLICATION_CREDENTIALS or the optional complete FIREBASE_ADMIN credential set. Never commit credential files or expose private credentials through NEXT_PUBLIC variables.

The application is not a static export. Deploy it as the independent Cloud Run client service so /learn and /api/auth/session can verify sessions on the server. The sibling server folder contains FastAPI and receives browser Firebase bearer tokens directly for privileged operations.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Available checks and production commands:

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

## Authentication and session model

`/` and the marketing site are public. `/learn` is rendered only after Firebase Admin verifies the `bayes_session` cookie. If a visitor requests it without a valid session, Next.js redirects them to `/auth/sign-in?returnTo=/learn`.

Firebase's browser SDK is explicitly configured with local persistence, so an active learner does not repeatedly see a sign-in prompt. After an interactive Google or GitHub sign-in, the client exchanges its Firebase ID token for a signed, `HttpOnly`, `Secure` (in production), `SameSite=Lax` cookie. The cookie is not accessible to JavaScript.

The cookie has a rolling 14-day inactivity limit. The browser renews it only after genuine interaction and at most once every ten minutes; a background Firebase token refresh alone cannot keep it alive. Once the cookie has expired, an older persisted browser identity cannot silently create a new server session: a fresh provider sign-in is required.

All future protected server pages and route handlers should call `getAuthenticatedSessionUser()` before loading learner-specific data. UI state from `useAuthentication()` is helpful for navigation, but it is not an access-control boundary.

## Project structure

- `features/authentication/` contains browser identity, server session verification, session policy, provider state, and authentication UI. Each concern has one clear home instead of a catch-all utility folder.
- `features/analytics/` starts Firebase Analytics only in the browser.

- `app/` — App Router layout, home page, and global styling.
- `public/assets/` — the provided asset library, copied with its original folders and files intact.
- `app/globals.css` — design tokens, Tailwind theme bridge, accessible base styles, and the starter page styles.

## Design system

The global stylesheet is the source of truth for the visual foundation. It carries the original burgundy and verdigris color scales, porcelain and ink neutrals, semantic status colors, semantic surface/action/text/border/focus tokens, typography, spacing, radius, and floating shadow values.

- **Display:** EB Garamond, used for expressive headings and selected editorial moments.
- **Interface:** IBM Plex Sans, used for body copy, navigation, labels, and controls.
- **Brand:** Oxblood burgundy `#5B0F1A` is the primary action and emphasis color; verdigris `#155F5A` is a supporting accent.
- **Canvas:** Porcelain `#FFFEFA`, with white surfaces and a warm subtle neutral `#F8F4ED`.
- **Layout:** Editorial asymmetry, generous whitespace, flat surfaces, restrained borders, and small corner radii.
- **Accessibility:** Visible oxblood focus ring, semantic status tokens, responsive layouts, and reduced-motion handling.

The palette, typography, and space scales are exposed as CSS custom properties and Tailwind v4 theme utilities. Add product components against semantic tokens so the interface remains consistent as it grows.

The landing page is deliberately compact and content-led. Learning paths, lesson content, quizzes, progress tracking, and gamification can be added as the product model takes shape.
