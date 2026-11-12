# Image preloading in a paginated UI

A Next.js test case for comparing image preloading strategies against a non-optimized baseline, with an integrated performance log. The table contains 70 client-generated rows across 10 pages, with seven thumbnails per page.

## Modes

- **Baseline:** renders only the current page; thumbnails load lazily.
- **Preload:** also creates `Image` objects for the next page, using the same thumbnail URLs as the table.
- **Activity:** mounts the current and next pages with React's `Activity`; hidden thumbnails load eagerly. Enable **Keep visited pages** to retain previously visited pages as well.

Changing modes returns to page 1. Select a mode in the UI or use `?mode=baseline`, `?mode=preload`, or `?mode=activity`.

## Image requests

Each thumbnail follows two server-side routes:

1. `/api/thumb/[id]` waits 1,500 ms by default, then returns a non-cacheable redirect with a new random signature.
2. `/api/image/[id]` waits 500 ms by default, fetches a JPEG from Unsplash, and returns it with `Cache-Control: private, max-age=3600`. Ten photos repeat across the 70 rows.

The changing signature means the image URL can differ on every redirect, even when the thumbnail URL is the same. The image route requires outbound access to `images.unsplash.com`. Change the delays without redeploying, for example with `?hop1=1000&hop2=250`; values are in milliseconds and limited to 0-30000.

## Testing

Test against the deployed Vercel URL rather than the development server. Hard-reload between modes and leave DevTools' **Disable cache** unchecked. Navigate with the page controls and compare entries in the measurement log; use **Clear log** to reset it.

Each completed transition records its mode, pages, elapsed time until all destination thumbnails load or error, and observed thumbnail and image request counts. A transition interrupted by another navigation is marked accordingly. Lazy images outside the viewport may not load until scrolled into view.

Request counts come from `PerformanceObserver` resource timing entries. Browsers report a redirect chain as one entry, so image-hop counts are inferred from redirect timing; entries still in flight when the measurement is saved may be missing. Treat the counts as estimates, not a network request ledger.

## Local development

Use Node.js 20.9 or later and install dependencies with npm:

```sh
npm install
npm run dev
```

Open http://localhost:3000. Run `npm run build` to check the production build. React 19.2 or later is required for `Activity`.
Run the image route tests with `node --experimental-default-type=module --test tests/image.test.mjs`.
