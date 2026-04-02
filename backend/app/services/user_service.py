from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.errors import api_error, forbidden, unauthorized
from app.core.security import hash_password, verify_password
from app.models import AuditAction, User, UserRole
from app.schemas.auth import UserOut
from app.schemas.user import UserListResponse, UserUpdate
from app.services.audit_service import log_action


def _require_admin(current_user: User) -> None:
    if current_user.role != UserRole.ADMIN:
        raise forbidden("INSUFFICIENT_PERMISSIONS", "Admin role required")


def list_users(db: Session, page: int = 1, page_size: int = 10) -> UserListResponse:
    query = db.query(User).order_by(User.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return UserListResponse(items=[UserOut.model_validate(item) for item in items], total=total)


def get_user(db: Session, user_id) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise api_error("USER_NOT_FOUND", "User not found", 404)
    return UserOut.model_validate(user)


def update_user(db: Session, user_id, data: UserUpdate, current_user: User) -> UserOut:
    _require_admin(current_user)
    user = db.get(User, user_id)
    if user is None:
        raise api_error("USER_NOT_FOUND", "User not found", 404)

    if user.id == current_user.id and data.is_active is False:
        raise api_error("CANNOT_DEACTIVATE_SELF", "You cannot deactivate your own account", 400)

    before = {"full_name": user.full_name, "role": user.role.value, "is_active": user.is_active}
    payload = data.model_dump(exclude_unset=True)
    for field, value in payload.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    log_action(db, current_user.id, AuditAction.UPDATE, "User", str(user.id), before=before, after={"full_name": user.full_name, "role": user.role.value, "is_active": user.is_active})
    return UserOut.model_validate(user)


def change_password(db: Session, current_user: User, old_password: str, new_password: str) -> dict:
    user = db.get(User, current_user.id)
    if user is None or not verify_password(old_password, user.hashed_password):
        raise unauthorized("INVALID_PASSWORD", "Current password is incorrect")

    user.hashed_password = hash_password(new_password)
    db.commit()
    log_action(db, current_user.id, AuditAction.UPDATE, "User", str(user.id), before={"password_changed": False}, after={"password_changed": True})
    return {"status": "password_updated"}
