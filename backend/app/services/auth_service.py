from __future__ import annotations

from datetime import UTC, datetime, timedelta
from hashlib import sha256
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import api_error, unauthorized
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.models import RefreshToken, User, UserRole
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.services.audit_service import log_action


def _refresh_token_hash(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def _token_payload(user: User) -> dict:
    return {"sub": str(user.id), "email": user.email, "role": user.role.value}


def _build_token_response(user: User, access_token: str, refresh_token: str) -> TokenResponse:
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=user,
    )


def _refresh_expires_at() -> datetime:
    return datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)


def register_user(db: Session, data: RegisterRequest) -> User:
    email = data.email.lower()
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user is not None:
        raise api_error("EMAIL_ALREADY_EXISTS", "A user with this email already exists", 409)

    user = User(
        email=email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.VIEWER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(db, user.id, "CREATE", "User", str(user.id), before=None, after={"email": user.email, "full_name": user.full_name, "role": user.role.value})
    return user


def login_user(db: Session, data: LoginRequest) -> TokenResponse:
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if user is None or not user.is_active or not verify_password(data.password, user.hashed_password):
        raise unauthorized("INVALID_CREDENTIALS", "Invalid email or password")

    access_token = create_access_token(_token_payload(user))
    refresh_token = create_refresh_token(_token_payload(user))

    refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=_refresh_token_hash(refresh_token),
        expires_at=_refresh_expires_at(),
        revoked=False,
    )
    db.add(refresh_record)
    db.commit()
    db.refresh(refresh_record)

    log_action(db, user.id, "LOGIN", "User", str(user.id), before=None, after={"email": user.email})
    return _build_token_response(user, access_token, refresh_token)


def refresh_tokens(db: Session, refresh_token: str) -> TokenResponse:
    payload = decode_token(refresh_token)
    if payload.get("token_type") != "refresh":
        raise unauthorized("INVALID_TOKEN", "Refresh token required")

    subject = payload.get("sub")
    if not subject:
        raise unauthorized("INVALID_TOKEN", "Token subject missing")

    user = db.get(User, uuid.UUID(str(subject)))
    if user is None or not user.is_active:
        raise unauthorized("USER_NOT_FOUND", "User not found or inactive")

    token_hash = _refresh_token_hash(refresh_token)
    refresh_record = (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == user.id, RefreshToken.token_hash == token_hash)
        .first()
    )
    if refresh_record is None:
        raise unauthorized("INVALID_REFRESH_TOKEN", "Refresh token is invalid")

    if refresh_record.revoked or refresh_record.expires_at <= datetime.now(UTC):
        raise unauthorized("REFRESH_TOKEN_EXPIRED", "Refresh token is expired or revoked")

    refresh_record.revoked = True

    new_access_token = create_access_token(_token_payload(user))
    new_refresh_token = create_refresh_token(_token_payload(user))
    new_refresh_record = RefreshToken(
        user_id=user.id,
        token_hash=_refresh_token_hash(new_refresh_token),
        expires_at=_refresh_expires_at(),
        revoked=False,
    )

    db.add(new_refresh_record)
    db.commit()
    db.refresh(new_refresh_record)

    log_action(
        db,
        user.id,
        "UPDATE",
        "RefreshToken",
        str(refresh_record.id),
        before={"revoked": False},
        after={"revoked": True},
    )
    return _build_token_response(user, new_access_token, new_refresh_token)


def logout_user(db: Session, token: str, current_user: User) -> dict:
    payload = decode_token(token)
    if payload.get("token_type") != "refresh":
        raise unauthorized("INVALID_TOKEN", "Refresh token required")

    subject = payload.get("sub")
    if subject != str(current_user.id):
        raise unauthorized("INVALID_TOKEN", "Token does not belong to the current user")

    token_hash = _refresh_token_hash(token)
    refresh_record = (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == current_user.id, RefreshToken.token_hash == token_hash)
        .first()
    )
    if refresh_record is None:
        raise unauthorized("INVALID_REFRESH_TOKEN", "Refresh token is invalid")

    refresh_record.revoked = True
    db.commit()

    log_action(
        db,
        current_user.id,
        "LOGOUT",
        "RefreshToken",
        str(refresh_record.id),
        before={"revoked": False},
        after={"revoked": True},
    )
    return {"status": "logged_out"}
