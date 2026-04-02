from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.transaction import TransactionType


class DashboardSummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    transaction_count: int


class CategoryBreakdown(BaseModel):
    category_name: str
    total: Decimal
    percentage: float
    color_hex: str


class MonthlyTrend(BaseModel):
    month: str
    income: Decimal
    expenses: Decimal
    net: Decimal


class RecentTransaction(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    amount: Decimal
    type: TransactionType
    category_name: Optional[str]
    date: date
    notes: Optional[str]


class DashboardResponse(BaseModel):
    summary: DashboardSummary
    category_breakdown: list[CategoryBreakdown]
    monthly_trend: list[MonthlyTrend]
    recent_transactions: list[RecentTransaction]
