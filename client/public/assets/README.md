# Bayes Institute Asset Library

This folder contains the reusable Bayes Institute brand assets retained for web and digital use. Use it for website platforms, product interfaces, presentations, and campaign work.

## Folder map

| Folder | Contents | Use |
| --- | --- | --- |
| `logos/svg/full-logo/` | Primary, inverse, black, tight, and fixed-background full logos | Default logo source for digital use. Prefer SVG. |
| `logos/svg/wordmark/` | Primary, inverse, and black wordmark-only SVG variants | Space-constrained editorial layouts. |
| `logos/svg/emblem/` | Primary, inverse, black, tight, and fixed-background emblem SVG variants | App icons, avatars, compact identifiers, and decorative marks. |
| `logos/webp/` | 320px, 640px, and 1280px primary/inverse full logos | Raster fallback where SVG is unavailable. |
| `icons/` | Favicon, Apple Touch, Android, maskable, and monochrome PWA icons | Browser tabs, mobile home screens, and PWA metadata. |
| `social/` | Open Graph cards and a square schema logo | Social previews and structured data. |
| `web/` | PWA manifest and reusable head metadata | Website implementation. |

## Logo selection

- Use `logos/svg/full-logo/primary.svg` on porcelain, white, and very pale neutral surfaces.
- Use `logos/svg/full-logo/inverse.svg` on oxblood or another approved dark field.
- Use the `*-on-porcelain` and `*-on-burgundy` files only when a logo must include its background as part of the asset itself.
- Use `logos/svg/emblem/primary.svg` for compact placements; do not recreate or recolor the emblem.
- Use `logos/webp/` only where an SVG cannot be used. Select the smallest source that still renders sharply at the intended display size.

## Web deployment

The paths in `web/site.webmanifest` and `web/head-snippet.html` assume this folder will be published as `/assets/` at the web root. In a Next.js project, copy this folder into `public/assets/`, then reference files such as:

```html
<link rel="icon" href="/assets/icons/favicon.svg" type="image/svg+xml" />
<link rel="manifest" href="/assets/web/site.webmanifest" />
```

Use `social/open-graph-1200x630.png` for Open Graph and X/Twitter previews. It is a 1200 × 630 asset. The JPEG alternative is available for platforms that require JPEG uploads.

## Source and maintenance

- Optimized digital SVGs originate from `brochure/logo_assets/all-optimized-svgs/`.
- WebP, PWA, social, favicon, and illustration assets originate from `web/public/assets/`.
- The source folders are retained as provenance. Update this library deliberately when approved brand assets change; do not create one-off copies inside application folders.
