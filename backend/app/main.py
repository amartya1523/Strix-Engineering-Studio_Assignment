import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from .config import get_settings
from .db import engine
from .middleware import UploadBodyLimit
from .routers import auth, projects, providers, reviews, chat

settings = get_settings()


@asynccontextmanager
async def lifespan(app):
    settings.secret_key()
    if settings.environment != "development" and not settings.cookie_secure:
        raise RuntimeError("COOKIE_SECURE must be true outside development")
    yield


app = FastAPI(title="CodeAtlas API", version="1.0.0", lifespan=lifespan)
app.add_middleware(UploadBodyLimit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-Requested-With"],
)
# Single-process assessment deployment. Use a shared gateway limiter when scaling.
attempts = defaultdict(deque)


@app.middleware("http")
async def protection(request: Request, call_next):
    if request.method in {"POST", "PUT", "DELETE", "PATCH"}:
        if request.headers.get("x-requested-with") != "CodeAtlas":
            return JSONResponse({"detail": "Missing CSRF protection header"}, status_code=403)
        origin = request.headers.get("origin")
        if origin and origin != settings.frontend_origin:
            return JSONResponse({"detail": "Origin is not allowed"}, status_code=403)
    if request.url.path in {"/api/auth/login", "/api/auth/register"} and request.method == "POST":
        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        # Bound memory used by expired IP entries.
        for ip in list(attempts):
            if not attempts[ip] or attempts[ip][-1] < now - 60:
                del attempts[ip]
        queue = attempts[key]
        while queue and queue[0] < now - 60:
            queue.popleft()
        if len(queue) >= 20:
            return JSONResponse({"detail": "Too many attempts. Try again in a minute."}, status_code=429)
        queue.append(now)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health", tags=["Health"])
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        return JSONResponse({"status": "unhealthy", "database": "unavailable"}, status_code=503)


for router in [auth.router, projects.router, providers.router, reviews.router, chat.router]:
    app.include_router(router, prefix="/api")
