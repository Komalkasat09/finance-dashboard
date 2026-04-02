from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_analyst_or_above, require_admin, require_any_role
from app.core.limiter import limiter
from app.models.transaction import TransactionType
from app.models.user import User, UserRole
from app.schemas.transaction import TransactionCreate, TransactionListResponse, TransactionOut, TransactionUpdate
from app.services.transaction_service import create_transaction, export_csv, get_transaction, list_transactions, restore_transaction, soft_delete_transaction, update_transaction


router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("/", response_model=TransactionListResponse)
@limiter.limit("60/minute")
def list_all(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    type_filter: TransactionType | None = Query(default=None, alias="type"),
    category_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    q: str | None = None,
):
    return list_transactions(db, current_user, page, page_size, type_filter, category_id, date_from, date_to, q)


@router.post("/", response_model=TransactionOut, status_code=201)
@limiter.limit("60/minute")
def create(request: Request, payload: TransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst_or_above())):
    return create_transaction(db, payload, current_user)


@router.get("/export")
@limiter.limit("60/minute")
def export(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above()),
    type_filter: TransactionType | None = Query(default=None, alias="type"),
    category_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    q: str | None = None,
):
    return export_csv(db, current_user, type_filter, category_id, date_from, date_to, q)


@router.get("/{transaction_id}", response_model=TransactionOut)
@limiter.limit("60/minute")
def read_one(request: Request, transaction_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_transaction(db, transaction_id, current_user)


@router.put("/{transaction_id}", response_model=TransactionOut)
@limiter.limit("60/minute")
def edit(request: Request, transaction_id: UUID, payload: TransactionUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_analyst_or_above())):
    return update_transaction(db, transaction_id, payload, current_user)


@router.delete("/{transaction_id}")
@limiter.limit("60/minute")
def delete(request: Request, transaction_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_admin())):
    return soft_delete_transaction(db, transaction_id, current_user)


@router.post("/{transaction_id}/restore")
@limiter.limit("60/minute")
def restore(request: Request, transaction_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(require_admin())):
    return restore_transaction(db, transaction_id, current_user)
