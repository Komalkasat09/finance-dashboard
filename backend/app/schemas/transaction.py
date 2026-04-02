from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.transaction import TransactionType


class TransactionCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    type: TransactionType
    category_id: Optional[UUID] = None
    date: date
    notes: Optional[str] = None


class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = Field(default=None, gt=0)
    type: Optional[TransactionType] = None
    category_id: Optional[UUID] = None
    date: Optional[date] = None
    notes: Optional[str] = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    amount: Decimal
    type: TransactionType
    category_id: Optional[UUID]
    category_name: Optional[str] = None
    date: date
    notes: Optional[str] = None
    created_by: UUID
    deleted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    is_deleted: bool


class TransactionListResponse(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int
    total_pages: int
