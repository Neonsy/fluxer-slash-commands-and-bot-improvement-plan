# Fluxer Bot Platform PRD website

Static review site for the PRD and its supporting research.

## What gets published

- `../PRD.md` is the homepage and the source for product scope and delivery order
- `../Research/guide/` is the main walkthrough
- `../Research/reference/` contains technical rules and acceptance scenarios
- `../Research/raw/` is owner-only working output and is not loaded, rendered, searched, or linked by the site

Markdown links are checked and converted to site routes during the build. The site does not maintain a separate summary of the product behavior.

## Technical profile

- Astro 7 static output for GitHub Pages
- Custom dark-theme documentation CSS with no animation or client-side routing
- Pagefind full-text search over rendered research files
- TypeScript content validation, Astro checks, Vitest, Playwright, and axe-core
- Core reading and navigation work without client-side JavaScript. JavaScript is used for full-text search, referenced-heading targeting, and scrollable-table keyboard support

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Canonical Fluxer Bot Platform PRD |
| `/evidence/` | Searchable public guide and contract reference |
| `/evidence/source/**` | Rendered public files from `Research/` with `raw/` excluded |
| `/404.html` | Redirect to the plan homepage |

## Development

Requires Node.js 24 or newer and pnpm 11.

```sh
pnpm install
pnpm dev
```

Run all checks:

```sh
pnpm check
pnpm test
pnpm build
pnpm test:e2e
```

The production build is emitted to `dist/`. Pagefind indexes generated source pages after the Astro build completes.

## Publishing

`.github/workflows/web-pages.yml` validates and publishes `web/` when manually started. The Astro configuration derives the repository subpath in GitHub Actions. `SITE_URL` and `SITE_BASE_PATH` may override it for a custom Pages deployment.
