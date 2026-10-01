# Bayes Learning Platform

A Next.js App Router scaffold for a content-led learning platform. It includes TypeScript, Tailwind CSS v4, ESLint, and Turbopack, with the Bayes Institute brand system established as global CSS tokens.

## Getting started

Requires Node.js 20.9 or newer.

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to the public site origin before deploying, so social preview URLs use the deployed domain.

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

## Project structure

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
