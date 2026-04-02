from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from app.schemas.auth import UserOut
from app.models.user import UserRole


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserListResponse(BaseModel):
    items: list[UserOut]
    total: int


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
