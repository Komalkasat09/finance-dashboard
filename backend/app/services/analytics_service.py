from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from calendar import monthrange
from sqlalchemy import case, func, String, cast
from sqlalchemy.orm import Session

from app.models import Category, Transaction, TransactionType, User
from app.schemas.analytics import CategoryBreakdown, DashboardResponse, DashboardSummary, MonthlyTrend, RecentTransaction


def _month_key(dt: date) -> str:
    return dt.strftime("%Y-%m")


def _add_months(source: date, months: int) -> date:
    year = source.year + (source.month - 1 + months) // 12
    month = (source.month - 1 + months) % 12 + 1
    day = min(source.day, monthrange(year, month)[1])
    return date(year, month, day)


def get_dashboard(db: Session, current_user: User) -> DashboardResponse:
    now = datetime.now(UTC).date()
    six_months_ago = _add_months(now.replace(day=1), -5)

    base_query = db.query(Transaction).filter(Transaction.deleted_at.is_(None))

    income_total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.deleted_at.is_(None), Transaction.type == TransactionType.INCOME)
        .scalar()
        or Decimal("0")
    )
    expense_total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.deleted_at.is_(None), Transaction.type == TransactionType.EXPENSE)
        .scalar()
        or Decimal("0")
    )
    transaction_count = base_query.count()

    month_expr = func.substr(cast(Transaction.date, String), 1, 7)
    monthly_rows = (
        db.query(
            month_expr.label("month"),
            func.sum(case((Transaction.type == TransactionType.INCOME, Transaction.amount), else_=0)).label("income"),
            func.sum(case((Transaction.type == TransactionType.EXPENSE, Transaction.amount), else_=0)).label("expenses"),
        )
        .filter(Transaction.deleted_at.is_(None), Transaction.date >= six_months_ago)
        .group_by(month_expr)
        .all()
    )
    monthly_map = {row.month: row for row in monthly_rows}
    monthly_trend: list[MonthlyTrend] = []
    for offset in range(5, -1, -1):
        month_date = _add_months(now.replace(day=1), -(5 - offset))
        month = _month_key(month_date)
        row = monthly_map.get(month)
        income = Decimal(str(row.income or 0)) if row else Decimal("0")
        expenses = Decimal(str(row.expenses or 0)) if row else Decimal("0")
        monthly_trend.append(MonthlyTrend(month=month, income=income, expenses=expenses, net=income - expenses))

    category_rows = (
        db.query(Category.name, Category.color_hex, func.coalesce(func.sum(Transaction.amount), 0).label("total"))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.deleted_at.is_(None), Transaction.type == TransactionType.EXPENSE)
        .group_by(Category.id)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    total_expenses = Decimal(str(expense_total or 0))
    category_breakdown = [
        CategoryBreakdown(
            category_name=row.name,
            total=Decimal(str(row.total or 0)),
            percentage=float((Decimal(str(row.total or 0)) / total_expenses * 100) if total_expenses else 0),
            color_hex=row.color_hex,
        )
        for row in category_rows
    ]

    recent_rows = db.query(Transaction).filter(Transaction.deleted_at.is_(None)).order_by(Transaction.date.desc(), Transaction.created_at.desc()).limit(10).all()
    recent_transactions = [
        RecentTransaction(
            id=row.id,
            amount=row.amount,
            type=row.type,
            category_name=(db.get(Category, row.category_id).name if row.category_id and db.get(Category, row.category_id) else None),
            date=row.date,
            notes=row.notes,
        )
        for row in recent_rows
    ]

    return DashboardResponse(
        summary=DashboardSummary(
            total_income=Decimal(str(income_total or 0)),
            total_expenses=Decimal(str(expense_total or 0)),
            net_balance=Decimal(str(income_total or 0)) - Decimal(str(expense_total or 0)),
            transaction_count=transaction_count,
        ),
        category_breakdown=category_breakdown,
        monthly_trend=monthly_trend,
        recent_transactions=recent_transactions,
    )
