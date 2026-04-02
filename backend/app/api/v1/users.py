from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_admin
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.auth import UserOut
from app.schemas.user import ChangePasswordRequest, UserListResponse, UserUpdate
from app.services.user_service import change_password, get_user, list_users, update_user


router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=UserListResponse)
@limiter.limit("60/minute")
def list_all(request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_admin()), page: int = 1, page_size: int = 10):
    return list_users(db, page, page_size)


@router.get("/{user_id}", response_model=UserOut)
@limiter.limit("60/minute")
def read_one(request: Request, user_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_admin())):
    return get_user(db, user_id)


@router.put("/{user_id}", response_model=UserOut)
@limiter.limit("60/minute")
def edit(request: Request, user_id: UUID, payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin())):
    return update_user(db, user_id, payload, current_user)


@router.post("/me/change-password")
@limiter.limit("60/minute")
def password_change(request: Request, payload: ChangePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return change_password(db, current_user, payload.old_password, payload.new_password)