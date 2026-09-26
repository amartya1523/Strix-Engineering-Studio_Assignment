# Verification report

Verified locally on **26 September 2026** with Node.js 22.22.2, Python 3.12, PostgreSQL 16.15 and Chromium through Playwright.

## Results

| Check | Observed outcome |
| --- | --- |
| Backend integration/unit tests | **32 passed** against real PostgreSQL |
| Ruff lint | Passed |
| Ruff formatting check | Passed |
| Frontend ESLint | Passed without warnings |
| TypeScript strict typecheck | Passed |
| Next.js production build | Passed; all pages and the route proxy compiled |
| Browser end-to-end suite | **3 passed**, including the comprehensive desktop workflow and mobile navigation/layout |
| PostgreSQL migration round trip | Upgrade → downgrade → upgrade passed on a dedicated scratch database |
| Docker Compose configuration | `docker compose config --quiet` passed after generating local secrets |
| Frontend dependency audit | npm reported **0 vulnerabilities** at installation |
| Running application | Frontend production server opened at `http://localhost:3000`; backend health returned `database: connected` |
| Visual review | Desktop login, populated dashboard/workbench and 390px mobile dashboard reviewed; no horizontal overflow in tested mobile pages |

## Backend coverage

- Registration validation, email normalization, duplicate accounts and invalid passwords.
- HttpOnly/SameSite cookies, current-account endpoint, session expiry and logout replay rejection.
- CSRF header, origin rejection and authentication request limiting.
- Project creation/list/detail, text-source preview, replacement by path and deletion cascade.
- Cross-user project/file/provider/review/chat access denied; history lists only owned projects.
- ZIP folder hierarchy, secret-file/generated-directory exclusion, corrupt archive, binary and oversized-file rejection.
- Absolute/traversal/Windows path rejection and request-body limits before multipart parsing.
- Provider key encryption, secret-free response serialization, edits, connection test and deletion.
- Unsafe provider destinations and URL credential/query rejection.
- All five analysis modes, structured severity output, exact path/line references and searchable stored history.
- One-file, multiple-file and whole-project selection; invalid selections rejected.
- Malformed AI output, invented source references, credential failure and context-overflow errors do not save successful reviews.
- OpenAI-compatible JSON-mode fallback for servers rejecting `response_format`.
- Lexical retrieval, chat source context, recent message context, persistence and deletion cascade.

## Browser coverage

1. **Protected navigation:** unauthenticated project access redirects to the login screen.
2. **Full desktop lifecycle:** registration → project creation → file upload → preview/highlighting → provider creation/connection check → selected-file security review → source-line navigation → Markdown download → documentation generation → architecture analysis → chat → reload/persistence → history search/details → project/provider deletion → logout → login.
3. **Mobile:** 390 × 844 viewport; registration, empty dashboard, side navigation, provider empty state and no document-level horizontal overflow.

Browser tests use a separate PostgreSQL database ending in `_e2e`. A local OpenAI-compatible fixture server exercises real HTTP transport, context and structured responses. Its provider name and every response clearly say **TEST FIXTURE / not AI**. Test projects/providers are deleted through the workflow; test accounts remain only in the dedicated test database. No test account/provider was created in the normal application database.

## Corrections during verification

- IPv6 `::1` was initially rejected by the reserved-address check. Local loopback is now accepted when local AI support is enabled, preserving LM Studio/Ollama use through localhost.
- The frontend dashboard screenshot now waits for its project data rather than recording an intermediate loading state.
- Source-reference navigation scrolls the source pane rather than deliberately scrolling the entire workspace.
- Multipart uploads are bounded before parsing, including requests without a declared content length, in addition to source/archive/project quotas.
- Final readability adjustments increased source and analysis-control text sizes; responsive screenshots were reviewed after the changes.

## Limits of this verification

- **No paid/cloud credentials or running LM Studio/Ollama model were available.** Live model quality, account-specific models and provider latency were not verified. The transport/contract paths were verified with HTTPX mocks and a separate deterministic endpoint.
- **Docker Engine was not running.** Compose configuration was validated; container builds/startup were not executed. The application itself ran directly on the host with real PostgreSQL.
- Automated browser coverage uses Chromium; other browser engines, broad accessibility audits, load tests and public deployment were not performed.
- The backend test runner emits a Starlette deprecation warning for its HTTPX TestClient adapter; assertions pass. It is a dependency warning, not an application failure.
- AI findings remain advisory. Character limits, lexical retrieval, process-local rate limiting, mutable file history and public deployment hardening are documented in `ARCHITECTURE.md`.

## Screenshots

The dashboard images below were captured from the browser test environment. Counts and accounts are test data, not preloaded application/demo data.

![Desktop project dashboard](docs/screenshots/projects-desktop.png)

![Mobile project dashboard](docs/screenshots/projects-mobile.png)
