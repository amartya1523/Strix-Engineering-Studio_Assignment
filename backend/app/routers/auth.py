import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..config import get_settings
from ..db import get_db
from ..models import User, Session as LoginSession
from ..schemas import Credentials, Registration, UserOut
from ..security import current_user, passwords, token_hash

router = APIRouter(prefix="/auth", tags=["Authentication"])
DUMMY_HASH = passwords.hash(secrets.token_urlsafe(32))


def establish_session(db, user, response):
    settings = get_settings()
    token = secrets.token_urlsafe(48)
    db.execute(delete(LoginSession).where(LoginSession.expires_at < datetime.now(timezone.utc)))
    db.add(
        LoginSession(
            token_hash=token_hash(token),
            user_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.session_hours),
        )
    )
    db.commit()
    response.set_cookie(
        "codeatlas_session",
        token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.session_hours * 3600,
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: Registration, response: Response, db: Session = Depends(get_db)):
    user = User(name=payload.name, email=payload.email, password_hash=passwords.hash(payload.password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists") from None
    establish_session(db, user, response)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: Credentials, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email))
    valid = passwords.verify(payload.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid:
        raise HTTPException(401, "Incorrect email or password")
    establish_session(db, user, response)
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    token = request.cookies.get("codeatlas_session", "")
    db.execute(delete(LoginSession).where(LoginSession.token_hash == token_hash(token)))
    db.commit()
    response.delete_cookie("codeatlas_session", path="/")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user
