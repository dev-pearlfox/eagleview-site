# Eagle View Website — Permanent Rules

## Environment notes (Manvi's setup)

- **Screenshots always live at `/Users/manojpro/Documents/Screenshots/`.** When Manvi says "check the latest screenshot," look there first (sorted by mtime), not on the Desktop.

## `eagleview.html` — redirect stub (permanent duplicate-content fix, 2026-09-17)

`eagleview.html` **used to be a byte-identical duplicate of `index.html`** (both 54,437 bytes serving identical content at two different URLs — classic duplicate-content SEO problem). As of 2026-09-17 it has been replaced with a ~1 KB **redirect stub** that bounces every visitor to `/`.

The stub uses four layers of redirect signal (any one of them alone works — all four together = bulletproof):
1. `<script>window.location.replace('/')` — instant JS redirect, and `.replace()` (not `.href =`) so `/eagleview.html` doesn't stay in the browser's back-button history.
2. `<meta http-equiv="refresh" content="0; url=/">` — HTML-level fallback for anyone with JS disabled.
3. `<link rel="canonical" href="https://eagleview.pearlfox.io/">` — tells search engines the real URL.
4. `<meta name="robots" content="noindex, follow">` — tells crawlers not to index the stub URL itself, but do follow the redirect (so ranking signals flow to `/`).

Rules going forward:
- **Never restore content to `eagleview.html`.** If you do, undo the canonical/noindex, or Google will drop the resurrected page from its index.
- The `sitemap.xml` intentionally lists **only `/` and `/privacy.html`** — `eagleview.html` is deliberately excluded because it's now a redirect, not a page.
- If any external site or old email links to `/eagleview.html`, the stub keeps those links working — users just get bounced to `/`.
- Google should drop `/eagleview.html` from its index within a few weeks of re-crawl (the `noindex` + canonical + redirect combo is stronger than canonical alone).
- A textbook "proper" solution would be a real HTTP 301 redirect, but GitHub Pages doesn't do server-side redirects without enabling Jekyll's `jekyll-redirect-from` plugin (which would touch how every page on the site is built — risk not worth the marginal SEO gain here).

## Favicon / GitHub Pages Octocat cache (SEO gotcha, fixed 2026-09-17)

Same setup as `pearlfox.io` — this is a GitHub Pages subdomain (`eagleview.pearlfox.io`), so it inherits the same octocat-cache trap: if Google's favicon indexer ever hits `/favicon.ico` while GitHub is serving a 404 HTML page (which embeds a base64 octocat), it can misfile the octocat as the site's favicon.

What was done on 2026-09-17:
- Generated proper icon sizes from the 1024×1024 master (`/Users/manojpro/Desktop/EagleView_Icon.png`): `favicon-96x96.png`, `apple-touch-icon.png` (180), `web-app-manifest-192x192.png`, `web-app-manifest-512x512.png`, `social-card.png` (1200).
- Cache-busted every favicon `<link>` across all 3 HTML pages with `?v=2` to force Google's favicon indexer to re-fetch.
- Added `robots.txt` (allows all, points at sitemap) and `sitemap.xml`.
- Added `site.webmanifest` for PWA + Google's manifest-based icon fallback.
- Rewrote OG/Twitter meta to use `social-card.png` (1200×1200) instead of the tiny `icon.png` (128×128); upgraded Twitter card to `summary_large_image`.
- Added JSON-LD `SoftwareApplication` schema to `index.html` and `eagleview.html` for rich-result eligibility.
- Fixed `privacy.html`'s malformed HTML head (was missing `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` open/close tags — technically renderable but triggered quirks mode and had no meta tags at all).

Rules going forward:
- If the icon design changes, **bump the query-string version** on all `<link rel="icon">` / `<link rel="apple-touch-icon">` tags across all 3 HTML pages (`?v=3`, then `?v=4`, …) — otherwise Google and users keep seeing the old cached icon for months.
- Never let `/favicon.ico` 404 on GitHub Pages, even temporarily, or the octocat-cache trap re-arms.
- Any newly-created HTML page in this site must copy the full favicon block + canonical from `index.html` — do not omit them "because browsers auto-request `/favicon.ico`"; Google's favicon indexer explicitly looks at the `<link>` tags.
- When editing `index.html`, edit `eagleview.html` identically (see duplicate-HTML section above) unless you're intentionally de-duplicating them.

## Known outstanding issues (NOT yet fixed as of 2026-09-17)

Documented so we don't forget:

1. **Branding inconsistency** — `privacy.html` title still says "by NewMan Tech" and its footer still mentions "Eagle View is a product of NewMan Tech", while the domain is `eagleview.pearlfox.io` and the copyright line says "© 2026 PearlFox". Pick one brand and align. (Manvi to decide.)
2. **`cursor: url('eagle-cursor.svg') !important` on `*, *::before, *::after`** in `index.html` / `eagleview.html` — this forces the custom cursor on every element, and paired with `user-select: none` on `*` it **makes it impossible for users to select or copy any text on the site**. Bad for accessibility, copy-paste, and mobile long-press. Should be scoped to specific interactive elements, not the universal selector.
3. **54 KB of inlined CSS in each HTML file** — extract to a shared `shared.css` (like `pearlfox-site` does) so pages become ~5–10 KB and CSS gets cached across pages.
4. **`overflow-x: hidden` on `body`** — usually papering over a layout bug where something is wider than the viewport. Find and fix the actual overflow rather than hiding it.
