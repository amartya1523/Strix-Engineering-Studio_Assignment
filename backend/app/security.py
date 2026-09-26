import hashlib
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, Request
from pwdlib import PasswordHash
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
from .config import get_settings
from .db import get_db
from .models import User, Session as LoginSession, Project, Provider

passwords = PasswordHash.recommended()


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("codeatlas_session", "")
    session = db.get(LoginSession, token_hash(token)) if token else None
    if not session or session.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(401, "Please sign in to continue")
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(401, "Please sign in to continue")
    return user


def owned_project(db, user, project_id):
    project = db.get(Project, project_id)
    if not project or project.user_id != user.id:
        raise HTTPException(404, "Project not found")
    return project


def environment_provider(user):
    settings = get_settings()
    if (
        not settings.default_ai_api_key.get_secret_value()
        or user.email != settings.default_ai_owner_email
        or user.id != settings.default_ai_owner_id
    ):
        return None
    # The credential is resolved per request, never returned to the browser or shared across accounts.
    return Provider(
        id="environment",
        user_id=user.id,
        name=settings.default_ai_provider_name,
        base_url=settings.default_ai_base_url,
        model=settings.default_ai_model,
        encrypted_key=encrypt(settings.default_ai_api_key.get_secret_value()),
    )


def owned_provider(db, user, provider_id):
    if provider_id == "environment":
        provider = environment_provider(user)
        if not provider:
            raise HTTPException(404, "AI provider not found")
        return provider
    provider = db.get(Provider, provider_id)
    if not provider or provider.user_id != user.id:
        raise HTTPException(404, "AI provider not found")
    return provider


def encrypt(value: str) -> str:
    return Fernet(get_settings().secret_key()).encrypt(value.encode()).decode() if value else ""


def decrypt(value: str) -> str:
    return Fernet(get_settings().secret_key()).decrypt(value.encode()).decode() if value else ""
