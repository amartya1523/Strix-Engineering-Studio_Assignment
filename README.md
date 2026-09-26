# CodeAtlas — AI-Powered Code Review Assistant

A complete full-stack internship assessment implementation. Upload a codebase, explore its source, run structured reviews with a provider of your choice, and ask questions grounded in your code.

**Stack:** Next.js 16 App Router · TypeScript · Tailwind CSS 4 · FastAPI · SQLAlchemy · PostgreSQL 16 · Alembic

## Start here

### Option 1: Docker Compose

Prerequisites: Docker Engine / Docker Desktop with Compose, internet access for the first build.

```bash
python3 scripts/configure.py
docker compose up --build
```

Open **http://localhost:3000**, create your account, create a project, and upload the sample files in `samples/` or your own ZIP. Add your AI provider under **AI providers** before running an analysis.

- API and interactive endpoint documentation: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health
- PostgreSQL is available on `localhost:5433` in Docker; the app uses the internal `db:5432` endpoint.
- Migrations run before the backend starts. Database data survives restarts in the `postgres_data` volume.
- Stop with `docker compose down`. Adding `-v` **permanently deletes** the database volume.
- Docker uses development cookie settings and localhost-only published ports. For public hosting, follow the deployment notes below.

`configure.py` creates random database and encryption secrets in the ignored root `.env` and preserves any existing file. Back up the encryption key: losing it makes saved AI keys unreadable.

### Option 2: Local development

Prerequisites: Node.js 22+, Python 3.12+, PostgreSQL 16+. Run commands from the repository root unless a `cd` is shown.

1. Create an isolated database role and databases using a PostgreSQL administrator:

```sql
CREATE ROLE codeatlas_dev LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE codeatlas OWNER codeatlas_dev;
CREATE DATABASE codeatlas_test OWNER codeatlas_dev;
CREATE DATABASE codeatlas_e2e OWNER codeatlas_dev;
```

2. Install and configure the backend:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```dotenv
DATABASE_URL=postgresql+psycopg://codeatlas_dev:choose-a-local-password@localhost:5432/codeatlas
FRONTEND_ORIGIN=http://localhost:3000
ENVIRONMENT=development
COOKIE_SECURE=false
ALLOW_LOCAL_AI=true
```

URL-encode reserved characters in the database password. In development only, the backend creates a persistent Fernet encryption key at `backend/.local/encryption.key` if `ENCRYPTION_KEY` is omitted. This path is ignored by Git.

3. Install the frontend:

```bash
cd frontend
npm ci
cp .env.example .env.local
cd ..
```

4. Start both services:

```bash
./scripts/dev.sh
```

The script applies migrations, runs the backend on port 8000 and the frontend on port 3000, and stops both when interrupted. Alternatively, run `alembic upgrade head` and `uvicorn app.main:app --reload` inside `backend` and `npm run dev` inside `frontend` in separate terminals. Windows users can use the separate-terminal commands with their virtual environment's `Scripts` directory.

For a frontend production build, run `npm run build` followed by `npm start` in `frontend` while the backend is running.

## Features and assessment coverage

| Assessment requirement | Implementation |
| --- | --- |
| Registration, login, logout, protected routes | Argon2 passwords; HttpOnly cookie; expiring, revocable database sessions; frontend route guard and backend ownership checks |
| Project creation, list, delete | Name, description, creation timestamp; source/review counts; deletion confirmation and database cascades |
| Code upload | ZIP **and** drag-and-drop multiple source files; stored in PostgreSQL and associated with a project |
| Code explorer | Collapsible folder tree, file preview, line numbers, Prism syntax highlighting, source-copy action |
| Single, multiple, entire-project review | Checkboxes select files; no selection means all project files |
| Structured results | Summary, issues with exact file/line references, recommendations, critical/high/medium/low severity filters |
| Three review templates | Security, performance, code quality |
| Review history | Persisted results; server-side search by project, mode and result content; paginated history; details and Markdown export |
| Chat with code | Persisted sessions/messages; lexical context retrieval; recent conversation context |
| Configurable AI | User-owned provider settings; base URL, model and encrypted key; edit, remove and connection test |
| Required providers | OpenAI, LM Studio, any OpenAI-compatible Chat Completions endpoint |
| Bonus provider support | Ollama and OpenRouter presets |
| Bonus feature 1 | Documentation generator: Markdown README, setup guide and API documentation |
| Bonus feature 2 | Architecture analysis: components, data flow, boundaries and tradeoffs |
| Submission structure and disclosure | Separate `frontend/`, `backend/`, plus `README.md`, `ARCHITECTURE.md`, `AI_USAGE.md` |

GitHub import, diff review and test generation are not implemented; ZIP/multiple-file upload and the two selected bonus features satisfy the assessment's choices.

## Provider setup

All providers use `{base_url}/chat/completions`. Choose an exact model ID that your provider supports for Chat Completions; the app intentionally does not assume a particular model is available.

| Provider | Base URL | API key | Model |
| --- | --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | Your OpenAI API key | An available Chat Completions model ID |
| LM Studio | `http://localhost:1234/v1` | Usually unnecessary | ID of the loaded model |
| Ollama | `http://localhost:11434/v1` | Usually unnecessary | Name of a pulled model |
| OpenRouter | `https://openrouter.ai/api/v1` | Your OpenRouter key | Provider/model ID from your account |
| Custom | Your HTTP(S) OpenAI-compatible base URL | As required | Exact server model ID |

For LM Studio, load a model and start its developer server. For Ollama, pull a model and start `ollama serve`. When the backend runs in Docker, replace `localhost` with `host.docker.internal`. The inference server must listen on an address reachable from the container; consult its access settings.

Use **Test connection** to validate model availability and credentials. A successful test sends a small request and may incur provider charges. Review/chat sends the selected/retrieved code to the selected provider; choose a local provider for sensitive code. No API key is needed merely to register, upload, preview, or browse the application.

Reviews request JSON mode and retry once without `response_format` for servers rejecting that option. Pydantic validates every result and its source references. Unsupported/malformed outputs produce an actionable error and are not recorded as successful reviews. No simulated AI results appear in the normal app.

## Environment variables

### Backend (`backend/.env`, or Compose service environment)

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL local example | SQLAlchemy PostgreSQL connection URL |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Exact permitted CORS / mutation origin |
| `ENVIRONMENT` | `development` | Outside development, require encryption key and secure cookies |
| `ENCRYPTION_KEY` | Generated locally in development | Fernet key protecting provider credentials |
| `COOKIE_SECURE` | `false` | Must be `true` outside development; requires HTTPS |
| `SESSION_HOURS` | `24` | Session expiration |
| `ALLOW_LOCAL_AI` | `true` | Permit private/loopback inference endpoints; disable on public deployments |
| `AI_TIMEOUT_SECONDS` | `120` | Provider request timeout |
| `MAX_CONTEXT_CHARS` | `60000` | Review context limit, including line numbers and path metadata |

Generate a Fernet key with:

```bash
backend/.venv/bin/python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
```

### Frontend (`frontend/.env.local`)

`BACKEND_URL` is server-only and defaults to `http://127.0.0.1:8000`. Browser requests use `/api` through the Next.js rewrite, keeping credentials same-origin. Rebuild the production frontend after changing `BACKEND_URL`, as rewrite destinations are resolved at build time. `CODEATLAS_E2E=true` isolates the browser-test build directory; normal users do not need it.

### Root Compose `.env`

`POSTGRES_PASSWORD` and `ENCRYPTION_KEY` are generated by `scripts/configure.py`. Never commit this file.

## Database and migrations

The versioned initial migration creates users, login sessions, projects, code files, AI providers, reviews, chat sessions and messages, including foreign keys, uniqueness constraints and indexes. Tables are **not** created implicitly on application startup.

```bash
cd backend
.venv/bin/alembic upgrade head
# After an intentional schema change:
.venv/bin/alembic revision --autogenerate -m "Describe schema change"
```

Inspect any generated migration before applying it. `alembic downgrade base` removes application tables and their data; use only on an expendable database. The initial migration can be tested on a dedicated scratch database.

## Verification

Backend tests require a dedicated database whose name ends in `_test`. The suite resets only that database's application tables.

```bash
cd backend
TEST_DATABASE_URL='postgresql+psycopg://codeatlas_dev:choose-a-local-password@localhost:5432/codeatlas_test' .venv/bin/pytest -q
.venv/bin/ruff check .
.venv/bin/ruff format --check .
cd ../frontend
npm run lint
npm run typecheck
npm run build
```

Browser tests require a separate database ending in `_e2e` and free ports 3100, 8001 and 8123:

```bash
cd frontend
E2E_DATABASE_URL='postgresql+psycopg://codeatlas_dev:choose-a-local-password@localhost:5432/codeatlas_e2e' npm run test:e2e
```

First install the browser with `npx playwright install chromium` (on Linux, `npx playwright install --with-deps chromium`). Playwright launches the frontend, backend with migrations, and `scripts/ai_fixture.py`. That endpoint returns conspicuously labeled deterministic **test fixtures**, not AI. Browser tests leave test accounts only in the dedicated E2E database. The normal application's database and provider configuration remain separate.

See `TEST_REPORT.md` for verified results and limitations. CI runs backend checks against a PostgreSQL service and checks the frontend with its committed lockfile.

## Upload and AI limits

- Maximum: 300 files per project, 512 KB per source file, 10 MB per upload/project.
- UTF-8 source text is stored in PostgreSQL; binary/unsupported files are ignored.
- `.env*`, dependency directories, generated build folders and Git metadata are excluded.
- ZIP entries are validated without filesystem extraction. Traversal, symlinks, invalid/encrypted ZIPs and decompressed size overflows are rejected.
- Re-uploading the same project-relative path replaces its source while retaining file ID.
- Reviews reject selections exceeding the context budget instead of silently omitting code. Choose fewer files when needed.
- Chat retrieves up to 12 relevant files with a simple lexical score. Oversized chat context is explicitly marked as truncated.
- AI cannot execute uploaded code. Results are advisory, and model accuracy depends on the selected model.

## Architecture overview

Browser → Next.js App Router / same-origin API proxy → FastAPI routers → SQLAlchemy → PostgreSQL. AI services construct bounded source context and call user-selected OpenAI-compatible endpoints. Provider keys remain encrypted at rest and are decrypted only server-side for requests. Read `ARCHITECTURE.md` for the schema, request flow and design tradeoffs.

## Public deployment considerations

This is a production-oriented assessment, not a claim of audited public-service readiness. Deploy behind HTTPS, set `ENVIRONMENT=production`, `COOKIE_SECURE=true`, an exact `FRONTEND_ORIGIN`, and a stable `ENCRYPTION_KEY`. Use `ALLOW_LOCAL_AI=false` and outbound firewall rules/approved provider hosts when serving untrusted users. Put upload size limits, shared rate limiting and request timeouts at the gateway. The built-in authentication limiter is process-local; large/parallel AI workloads would benefit from a worker queue and shared quotas. Back up the database and encryption key together.

Live paid-provider quality/latency evaluation needs your provider key or running local model. Docker deployment is supplied for reproducibility; see the test report for whether it was run in the development environment.

## Submission and Git

Source is organized in `frontend/` and `backend/`. Supporting scripts, CI, sample code and versioned migrations are included. Local Git commits separate the backend, frontend, and handover documentation. No remote repository, pull request or public deployment is created automatically.

The handover archive `CodeAtlas-submission.zip` contains the tracked source and documentation, excluding `.env` secrets, installed dependencies, database contents, virtual environments and build output. To regenerate it after your own edits, commit or stage the intended files and run:

```bash
python3 scripts/package_submission.py
```

To review locally, use `samples/auth.py` (deliberately flawed) and `samples/dashboard.tsx`. Do not use these sample implementations in production.
