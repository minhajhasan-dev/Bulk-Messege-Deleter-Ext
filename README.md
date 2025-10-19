# Side Panel MV3 Extension Scaffold

Production-grade scaffold for a Chrome MV3 side-panel extension built with:

- Vite + React + TypeScript
- TailwindCSS (PostCSS + Autoprefixer)
- Framer Motion animations
- Zustand state management
- Typed messaging bus between side panel, background and content scripts
- Vitest + React Testing Library, Playwright e2e scaffold
- ESLint (Airbnb + TS) + Prettier, Husky + lint-staged, Commitlint

## Features

- MV3 manifest configured for side_panel only (no browser action)
- Background service worker with a minimal message bus
- Side panel React skeleton: Header, Filters, ThreadList, PreviewPane, Stats, ActionBar, ConfirmDialog, Toasts
- Content script scaffolds for facebook.com and messenger.com
- Shared utilities: messaging/types, CSV export, date/format helpers
- Basic licensing module (trial gating) and opt‑in telemetry stub
- CI: lint + typecheck + test + build + zip

## Getting started

1. Install dependencies

```sh
npm ci
```

2. Start the dev server

```sh
npm run dev
```

This runs Vite with the CRX plugin. Open Chrome Canary/Stable and load the extension for development:

- Open `chrome://extensions`
- Enable Developer Mode
- Click "Load unpacked" and select the `dist` folder after the first build, or run `npm run build` and load `dist`.

3. Build

```sh
npm run build
```

4. Zip the extension

```sh
npm run build:zip
```

The zipped artifact will be created under `release/`.

## Project structure

```
/manifest.json            # MV3 manifest (side_panel)
/src
  /background             # Service worker
  /content                # Content scripts per-domain
  /panel                  # Side panel React app
  /shared                 # Shared modules (messaging, utils, license, telemetry)
/index.html               # Side panel entrypoint
```

## Testing

- Unit tests: `npm run test`
- E2E scaffold: `npm run e2e`

## Linting & formatting

- Lint: `npm run lint`
- Fix: `npm run lint:fix`
- Format: `npm run format`

## Notes

- The licensing and telemetry modules are stubs and should be replaced with production implementations.
- The content scripts include placeholders for a scanner and runner on Facebook and Messenger.
