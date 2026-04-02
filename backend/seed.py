from __future__ import annotations

import random
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

from faker import Faker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.database import Base
from app.core.security import hash_password
from app.models import Category, Transaction, TransactionType, User, UserRole


fake = Faker()


USER_SEEDS = [
    ("admin@finance.dev", "Admin@1234", UserRole.ADMIN, "Finance Admin"),
    ("analyst@finance.dev", "Analyst@1234", UserRole.ANALYST, "Finance Analyst"),
    ("viewer@finance.dev", "Viewer@1234", UserRole.VIEWER, "Finance Viewer"),
]

CATEGORY_SEEDS = [
    ("Salary", "#10B981", "💼", (40000, 120000), TransactionType.INCOME),
    ("Freelance", "#14B8A6", "🧰", (8000, 60000), TransactionType.INCOME),
    ("Rent", "#F43F5E", "🏠", (15000, 35000), TransactionType.EXPENSE),
    ("Food", "#F97316", "🍲", (2000, 8000), TransactionType.EXPENSE),
    ("Transport", "#3B82F6", "🚌", (500, 5000), TransactionType.EXPENSE),
    ("Utilities", "#8B5CF6", "💡", (1000, 12000), TransactionType.EXPENSE),
    ("Healthcare", "#EF4444", "🩺", (500, 15000), TransactionType.EXPENSE),
    ("Entertainment", "#F59E0B", "🎬", (500, 12000), TransactionType.EXPENSE),
]


def _load_database_url() -> str:
    return settings.DATABASE_URL


def _build_engine():
    return create_engine(_load_database_url())


def _random_transaction_date() -> date:
    today = datetime.now(UTC).date()
    start = today - timedelta(days=180)
    return start + timedelta(days=random.randint(0, 180))


def main() -> None:
    engine = _build_engine()
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    Base.metadata.create_all(bind=engine)

    admin_exists = session.query(User).filter(User.email == "admin@finance.dev").first()
    if admin_exists is not None:
        print("Seed data already exists. Skipping creation.")
        return

    users: dict[UserRole, User] = {}
    for email, password, role, full_name in USER_SEEDS:
        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=role,
            is_active=True,
        )
        session.add(user)
        users[role] = user

    session.commit()

    categories: list[Category] = []
    category_map: dict[str, Category] = {}
    for name, color_hex, icon, _, _ in CATEGORY_SEEDS:
        category = Category(name=name, color_hex=color_hex, icon=icon)
        session.add(category)
        categories.append(category)
        category_map[name] = category

    session.commit()

    admin_user = users[UserRole.ADMIN]
    for _ in range(200):
        name, _, _, amount_range, tx_type = random.choice(CATEGORY_SEEDS)
        category = category_map[name]
        amount = Decimal(str(random.randint(amount_range[0], amount_range[1])))
        if tx_type == TransactionType.EXPENSE:
            amount = Decimal(str(random.randint(amount_range[0], amount_range[1])))
        transaction = Transaction(
            user_id=admin_user.id,
            amount=amount,
            type=tx_type,
            category_id=category.id,
            date=_random_transaction_date(),
            notes=fake.sentence(nb_words=6),
            created_by=admin_user.id,
        )
        session.add(transaction)

    session.commit()

    print("\nFinance Dashboard seed complete\n")
    print(f"Users: {session.query(User).count()}")
    print(f"Categories: {session.query(Category).count()}")
    print(f"Transactions: {session.query(Transaction).count()}")
    print("\nLogin credentials:\n")
    print("Role       | Email                    | Password")
    print("-----------|--------------------------|-----------")
    print("Admin      | admin@finance.dev        | Admin@1234")
    print("Analyst    | analyst@finance.dev      | Analyst@1234")
    print("Viewer     | viewer@finance.dev       | Viewer@1234")


if __name__ == "__main__":
    main()