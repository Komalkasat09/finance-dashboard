from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.limiter import limiter
from app.models import User
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserOut
from app.services.auth_service import login_user, logout_user, refresh_tokens, register_user


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    return register_user(db, payload)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db, payload)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("60/minute")
def refresh(request: Request, payload: RefreshRequest, db: Session = Depends(get_db)):
    return refresh_tokens(db, payload.refresh_token)


@router.post("/logout")
@limiter.limit("60/minute")
def logout(request: Request, payload: RefreshRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return logout_user(db, payload.refresh_token, current_user)


@router.get("/me", response_model=UserOut)
@limiter.limit("60/minute")
def me(request: Request, current_user: User = Depends(get_current_user)):
    return current_user