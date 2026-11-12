# GitHub Codespaces ♥️ Next.js

Welcome to your shiny new Codespace running Next.js! We've got everything fired up and running for you to explore Next.js.

You've got a blank canvas to work on from a git perspective as well. There's a single initial commit with the what you're seeing right now - where you go from here is up to you!

Everything you do here is contained within this one codespace. There is no repository on GitHub yet. If and when you’re ready you can click "Publish Branch" and we’ll create your repository and push up your project. If you were just exploring then and have no further need for this code then you can simply delete your codespace and it's gone forever.

To run this application:

```
npm run dev
```

## Image pagination test

Open the deployed Vercel URL to compare baseline, preload, and Activity modes. Hard-reload between modes and leave DevTools' **Disable cache** unchecked. Test the deployed URL rather than the dev server.

Choose a mode at the top or set `?mode=baseline`, `?mode=preload`, or `?mode=activity`. Set the simulated delays in milliseconds with `?hop1=1500&hop2=500` (values are limited to 0-30000 ms). Navigate between pages to record the time until every visible thumbnail loads or errors. Activity can optionally keep visited pages mounted.

The log counts resource timing entries started during each transition. Browsers report a redirect chain as one resource entry, so image-hop counts are inferred from redirect timing. Requests still in flight when a measurement ends may not appear in the count.
