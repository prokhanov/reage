Plan: CSS preload + retry resilience for landing

1.  Add a build-time Vite plugin that injects a `<link rel="preload" as="style">` for the hashed main CSS bundle into `index.html`.
    - Hook: `transformIndexHtml` with access to `ctx.bundle`.
    - Locate the main CSS chunk (e.g. `assets/index-*.css`).
    - Inject `<link rel="preload" as="style" href="/{cssFile}" />` near the top of `<head>`, before the fonts link.
    - Leave Vite's own stylesheet injection untouched to avoid duplicate stylesheet links.

2.  Add an inline CSS retry script in `index.html`.
    - Runs immediately in `<head>`.
    - Watches existing and dynamically added `<link rel="stylesheet">` tags inside `/assets/`.
    - On `error` event, re-creates the `<link>` with a cache-busting `?retry=<timestamp>` parameter and swaps it in.
    - Retries once per link to avoid infinite loops.
    - Logs a concise warning to the console if a retry happens.

3.  Verify the change with a production build.
    - Run `bun run build`.
    - Inspect the generated `index.html` to confirm the preload link matches the actual CSS asset filename.
    - Confirm no duplicate `<link rel="stylesheet">` for the same bundle exists.

4.  Test failure/retry behavior.
    - Use a local dev preview or Playwright to block the CSS request once and confirm the retry link is issued and styles recover.

Technical details
- File to edit: `vite.config.ts` (add the plugin) and `index.html` (add the inline retry script).
- The preload does not block rendering beyond the normal stylesheet behavior; it only starts the CSS download earlier.
- The retry script is a small, dependency-free fallback for flaky mobile networks / ad-blocker-related network drops.
- No external libraries required; no changes to app components.
