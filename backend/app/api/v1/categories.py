from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.limiter import limiter
from app.models.user import User
from app.schemas.category import CategoryOut
from app.services.category_service import list_categories


router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", response_model=list[CategoryOut])
@limiter.limit("60/minute")
def list_all(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return list_categories(db)
