Bulk Message Deleter (MV3 side-panel)

Overview
- Chrome MV3 side-panel extension UI built with Vite + React + TypeScript + Tailwind.
- Side panel shows a People list with fuzzy search and a per-user Actions page with filters + preview.
- A minimal content script and background service worker are provided to enable the side panel on facebook.com and messenger.com and to mock data for development.

Key features
- PeopleList: virtualized list, fuzzy search (Fuse.js), animated rows.
- ConversationActions: filters (date range, time window, text-only vs include attachments, keyword), live preview with histogram and export to CSV.
- State management with Zustand.
- Messaging wrapper for extension/runtime via src/extension/shared/extensionApi.ts with a safe dev shim.
- Unit tests for filter composition and author-detection utilities.

Notes and limitations
- Deletion engine and DOM automation hooks are intentionally stubbed to avoid interacting with Facebook/Messenger in tests. The extension is structured to support platform adapters and content-script-driven automation, but the included content.js returns mock data only.
- Human-like pacing, dry-run, batch caps, resume, and persistence scaffolding can be layered on top of the existing store and messaging in a follow-up.

Develop
- npm i
- npm run dev (for local UI dev page)
- npm test (unit tests via Vitest)
- npm run build (produces dist with index.html usable as side panel)

Load extension
- npm run build
- Visit chrome://extensions and enable Developer mode.
- Load unpacked pointing to the dist directory. The side panel will be available on facebook.com and messenger.com tabs.

Safety
- This project targets only messages authored by the logged-in user via filter predicate logic. The included DOM heuristics for authorship are in src/logic/authorship.ts and covered by unit tests; real-world selectors must be validated in content scripts/adapters.
