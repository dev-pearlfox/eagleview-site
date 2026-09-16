# Eagle View Website — Permanent Rules

## Environment notes (Manvi's setup)

- **Screenshots always live at `/Users/manojpro/Documents/Screenshots/`.** When Manvi says "check the latest screenshot," look there first (sorted by mtime), not on the Desktop.

## `eagleview.html` — deleted (permanent duplicate-content fix, 2026-09-17)

`eagleview.html` **used to be a byte-identical duplicate of `index.html`** (both 54,437 bytes serving identical content at two different URLs — classic duplicate-content SEO problem). It was a **migration leftover** from when the site lived at `newmantech.in/eagleview.html` — during the move to the `eagleview.pearlfox.io` subdomain, someone copy-pasted `eagleview.html` → `index.html` to make the subdomain root work, but never deleted the original.

**Fixed on 2026-09-17 by deleting the file outright.** The URL `https://eagleview.pearlfox.io/eagleview.html` now returns a 404 from GitHub Pages. This is the cleanest possible fix — no maintenance, no redirect stub, no duplicate.

Why deletion (not a redirect stub) was the right call:
- **Semantic redundancy.** The whole subdomain IS Eagle View. Having `/eagleview.html` inside `eagleview.pearlfox.io` is like naming a room "House" inside your house.
- **Nothing on the live site linked to it** — the only references in the codebase are archived buy-page drafts that point at the *old* `newmantech.in` domain (irrelevant to the current site).
- **No known external inbound links** to the new-domain version of the URL (`eagleview.pearlfox.io/eagleview.html`) — it was never marketed. Any old external link that exists would still point at `newmantech.in/eagleview.html`, which is a separate problem (the whole old domain is dead).

Rules going forward:
- **Never re-create `eagleview.html`.** The whole subdomain is Eagle View — no need for a page inside called the same thing.
- The `sitemap.xml` intentionally lists **only `/` and `/privacy.html`** — matches reality now.
- If somehow a legit inbound link to `/eagleview.html` surfaces later, put a redirect stub back (see git history for the 2026-09-17 stub file that briefly existed).

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

## Payment page URL: flattened from `/eagleview/eagleview_payment.html` → `/eagleview_payment.html` (2026-09-17)

The payment page used to live at `https://eagleview.pearlfox.io/eagleview/eagleview_payment.html` — same redundant-`eagleview`-prefix problem as the deleted `eagleview.html` (see above). Moved to root as `/eagleview_payment.html` and the old nested URL was deleted with **no redirect stub** (per Manvi's explicit call).

**Files updated in the same commit as the move:**
- `Websites/eagleview-site/index.html` — "Buy a License" button `href` updated
- `Apps/Eagle View/src/App.jsx` — TWO occurrences updated (both `handleBuyLicense()` and `handleInfoPanelBuyLicense()`; grep for the URL to find them)

**⚠️ Deployment-order matters.** The website change and the desktop-app change **must go live together**, or roughly so:
- If you deploy the website *first* (delete old URL) and users on old app versions try to buy → they get 404s.
- If you deploy the app *first* (points at new URL) before the website deploys the new file → same problem.
- **Safest order:** ship the website first (both old and new URLs will 404 at old / work at new for a few seconds during deploy) — GitHub Pages deploys in seconds, so window is tiny. Then release the new app build.
- **Even safer:** temporarily restore a redirect stub at `/eagleview/eagleview_payment.html` until the majority of installed app versions have updated, THEN delete the stub.

**Historical note in testcase file:** `eagleview/testcase/index.html` line 1402 (TC-437) references `newmantech.in/eagleview/eagleview_payment.html` — that's the ancient pre-migration URL, kept as historical documentation of a v1.1.x test case. Not stale in the "needs fixing" sense — it's describing behavior of an old app version. Leave alone unless you're regenerating test cases.

## Known outstanding issues (NOT yet fixed as of 2026-09-17)

Documented so we don't forget:

1. **Branding inconsistency** — `privacy.html` title still says "by NewMan Tech" and its footer still mentions "Eagle View is a product of NewMan Tech", while the domain is `eagleview.pearlfox.io` and the copyright line says "© 2026 PearlFox". Pick one brand and align. (Manvi to decide.)
2. **`cursor: url('eagle-cursor.svg') !important` on `*, *::before, *::after`** in `index.html` / `eagleview.html` — this forces the custom cursor on every element, and paired with `user-select: none` on `*` it **makes it impossible for users to select or copy any text on the site**. Bad for accessibility, copy-paste, and mobile long-press. Should be scoped to specific interactive elements, not the universal selector.
3. **54 KB of inlined CSS in each HTML file** — extract to a shared `shared.css` (like `pearlfox-site` does) so pages become ~5–10 KB and CSS gets cached across pages.
4. **`overflow-x: hidden` on `body`** — usually papering over a layout bug where something is wider than the viewport. Find and fix the actual overflow rather than hiding it.
