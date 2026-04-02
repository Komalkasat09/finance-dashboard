from __future__ import annotations

from collections.abc import Callable
import uuid

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import forbidden, unauthorized
from app.core.security import decode_token
from app.models import User, UserRole


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def _role_value(role: UserRole | str) -> str:
    return role.value if hasattr(role, "value") else str(role)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(token)
    if payload.get("token_type") != "access":
        raise unauthorized("INVALID_TOKEN", "Access token required")

    subject = payload.get("sub")
    if not subject:
        raise unauthorized("INVALID_TOKEN", "Token subject missing")

    try:
        user_id = uuid.UUID(str(subject))
    except ValueError as exc:
        raise unauthorized("INVALID_TOKEN", "Token subject is invalid") from exc

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise unauthorized("USER_NOT_FOUND", "User not found or inactive")

    return user


def require_role(*roles: UserRole | str) -> Callable:
    allowed_roles = {_role_value(role) for role in roles}

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed_roles:
            raise forbidden("INSUFFICIENT_PERMISSIONS", "You do not have permission to perform this action")
        return current_user

    return dependency


def require_admin() -> Callable:
    return require_role(UserRole.ADMIN)


def require_analyst_or_above() -> Callable:
    return require_role(UserRole.ANALYST, UserRole.ADMIN)


def require_any_role(*roles: UserRole | str) -> Callable:
    return require_role(*roles)
