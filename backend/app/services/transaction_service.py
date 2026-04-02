from __future__ import annotations

import csv
from datetime import UTC, date, datetime
from decimal import Decimal
from io import StringIO
from math import ceil
from uuid import UUID

from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.errors import api_error, forbidden, unauthorized
from app.models import AuditAction, Category, Transaction, TransactionType, User, UserRole
from app.schemas.transaction import TransactionCreate, TransactionListResponse, TransactionOut, TransactionUpdate
from app.services.audit_service import log_action


def _require_analyst_or_above(current_user: User) -> None:
    if current_user.role not in {UserRole.ANALYST, UserRole.ADMIN}:
        raise forbidden("INSUFFICIENT_PERMISSIONS", "Analyst or admin role required")


def _require_admin(current_user: User) -> None:
    if current_user.role != UserRole.ADMIN:
        raise forbidden("INSUFFICIENT_PERMISSIONS", "Admin role required")


def _category_name(db: Session, category_id: UUID | None) -> str | None:
    if category_id is None:
        return None
    category = db.get(Category, category_id)
    return category.name if category else None


def _serialize_transaction(db: Session, transaction: Transaction) -> TransactionOut:
    return TransactionOut(
        id=transaction.id,
        user_id=transaction.user_id,
        amount=transaction.amount,
        type=transaction.type,
        category_id=transaction.category_id,
        category_name=_category_name(db, transaction.category_id),
        date=transaction.date,
        notes=transaction.notes,
        created_by=transaction.created_by,
        deleted_at=transaction.deleted_at,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
        is_deleted=transaction.deleted_at is not None,
    )


def _transaction_dict(db: Session, transaction: Transaction) -> dict:
    return {
        "id": str(transaction.id),
        "user_id": str(transaction.user_id),
        "amount": str(transaction.amount),
        "type": transaction.type.value,
        "category_id": str(transaction.category_id) if transaction.category_id else None,
        "category_name": _category_name(db, transaction.category_id),
        "date": transaction.date.isoformat(),
        "notes": transaction.notes,
        "created_by": str(transaction.created_by),
        "deleted_at": transaction.deleted_at.isoformat() if transaction.deleted_at else None,
        "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
        "updated_at": transaction.updated_at.isoformat() if transaction.updated_at else None,
        "is_deleted": transaction.deleted_at is not None,
    }


def _get_transaction_or_404(db: Session, transaction_id: UUID, include_deleted: bool = False) -> Transaction:
    query = db.query(Transaction).filter(Transaction.id == transaction_id)
    if not include_deleted:
        query = query.filter(Transaction.deleted_at.is_(None))
    transaction = query.first()
    if transaction is None:
        raise api_error("TRANSACTION_NOT_FOUND", "Transaction not found", 404)
    return transaction


def create_transaction(db: Session, data: TransactionCreate, current_user: User) -> TransactionOut:
    _require_analyst_or_above(current_user)

    if data.category_id is not None:
        category = db.get(Category, data.category_id)
        if category is None:
            raise api_error("CATEGORY_NOT_FOUND", "Category not found", 404)

    transaction = Transaction(
        user_id=current_user.id,
        amount=data.amount,
        type=data.type,
        category_id=data.category_id,
        date=data.date,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    transaction = db.query(Transaction).filter(Transaction.id == transaction.id).first()
    log_action(db, current_user.id, AuditAction.CREATE, "Transaction", str(transaction.id), before=None, after=_transaction_dict(db, transaction))
    return _serialize_transaction(db, transaction)


def list_transactions(
    db: Session,
    current_user: User,
    page: int = 1,
    page_size: int = 10,
    type_filter: TransactionType | None = None,
    category_id: UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    q: str | None = None,
) -> TransactionListResponse:
    query = db.query(Transaction).filter(Transaction.deleted_at.is_(None))
    if type_filter is not None:
        query = query.filter(Transaction.type == type_filter)
    if category_id is not None:
        query = query.filter(Transaction.category_id == category_id)
    if date_from is not None:
        query = query.filter(Transaction.date >= date_from)
    if date_to is not None:
        query = query.filter(Transaction.date <= date_to)
    if q:
        query = query.outerjoin(Category, Transaction.category_id == Category.id).filter(or_(Transaction.notes.ilike(f"%{q}%"), Category.name.ilike(f"%{q}%")))

    total = query.count()
    items = query.order_by(Transaction.date.desc(), Transaction.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    total_pages = ceil(total / page_size) if total else 0
    return TransactionListResponse(items=[_serialize_transaction(db, item) for item in items], total=total, page=page, page_size=page_size, total_pages=total_pages)


def get_transaction(db: Session, transaction_id: UUID, current_user: User) -> TransactionOut:
    transaction = _get_transaction_or_404(db, transaction_id)
    return _serialize_transaction(db, transaction)


def update_transaction(db: Session, transaction_id: UUID, data: TransactionUpdate, current_user: User) -> TransactionOut:
    _require_analyst_or_above(current_user)
    transaction = _get_transaction_or_404(db, transaction_id)
    before = _transaction_dict(transaction)

    payload = data.model_dump(exclude_unset=True)
    if "category_id" in payload and payload["category_id"] is not None:
        category = db.get(Category, payload["category_id"])
        if category is None:
            raise api_error("CATEGORY_NOT_FOUND", "Category not found", 404)

    for field, value in payload.items():
        setattr(transaction, field, value)

    db.commit()
    db.refresh(transaction)
    transaction = db.query(Transaction).filter(Transaction.id == transaction.id).first()
    after = _transaction_dict(db, transaction)
    log_action(db, current_user.id, AuditAction.UPDATE, "Transaction", str(transaction.id), before=before, after=after)
    return _serialize_transaction(db, transaction)


def soft_delete_transaction(db: Session, transaction_id: UUID, current_user: User) -> dict:
    _require_admin(current_user)
    transaction = _get_transaction_or_404(db, transaction_id, include_deleted=True)
    before = _transaction_dict(db, transaction)
    transaction.deleted_at = datetime.now(UTC)
    db.commit()
    db.refresh(transaction)
    log_action(db, current_user.id, AuditAction.DELETE, "Transaction", str(transaction.id), before=before, after=_transaction_dict(db, transaction))
    return {"status": "deleted"}


def restore_transaction(db: Session, transaction_id: UUID, current_user: User) -> dict:
    _require_admin(current_user)
    transaction = _get_transaction_or_404(db, transaction_id, include_deleted=True)
    before = _transaction_dict(db, transaction)
    transaction.deleted_at = None
    db.commit()
    db.refresh(transaction)
    log_action(db, current_user.id, AuditAction.UPDATE, "Transaction", str(transaction.id), before=before, after=_transaction_dict(db, transaction))
    return {"status": "restored"}


def export_csv(
    db: Session,
    current_user: User,
    type_filter: TransactionType | None = None,
    category_id: UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    q: str | None = None,
) -> StreamingResponse:
    _require_analyst_or_above(current_user)
    response = list_transactions(db, current_user, page=1, page_size=100000, type_filter=type_filter, category_id=category_id, date_from=date_from, date_to=date_to, q=q)

    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["id", "date", "category", "type", "amount", "notes"])
    for item in response.items:
        writer.writerow([item.id, item.date.isoformat(), item.category_name or "", item.type.value, str(item.amount), item.notes or ""])
    buffer.seek(0)
    return StreamingResponse(iter([buffer.getvalue()]), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="transactions.csv"'})
