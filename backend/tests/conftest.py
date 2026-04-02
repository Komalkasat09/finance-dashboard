from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.types import TypeDecorator, String

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("REFRESH_TOKEN_EXPIRE_DAYS", "7")

from app.core import database as database_module
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.core.limiter import limiter
from app.main import app
from app.models import Category, Transaction, TransactionType, User, UserRole


engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

database_module.engine = engine
database_module.SessionLocal = TestingSessionLocal
limiter.enabled = False


class SQLiteUUID(TypeDecorator):
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return uuid.UUID(value)

for table in Base.metadata.tables.values():
    for column in table.columns:
        if isinstance(column.type, PGUUID):
            column.type = SQLiteUUID()


def override_get_db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)


def _seed_auth_user(session, email: str, password: str, role: UserRole) -> User:
    user = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=email.split("@")[0].title(),
        role=role,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _seed_category(session, name: str = "Salary") -> Category:
    category = Category(name=name, color_hex="#10B981", icon="💼")
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


import pytest


@pytest.fixture()
def db_session():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides[get_db] = override_get_db


@pytest.fixture()
def admin_token(db_session):
    user = _seed_auth_user(db_session, "admin@test.dev", "Admin@1234", UserRole.ADMIN)
    return create_access_token({"sub": str(user.id), "email": user.email, "role": user.role.value})


@pytest.fixture()
def analyst_token(db_session):
    user = _seed_auth_user(db_session, "analyst@test.dev", "Analyst@1234", UserRole.ANALYST)
    return create_access_token({"sub": str(user.id), "email": user.email, "role": user.role.value})


@pytest.fixture()
def viewer_token(db_session):
    user = _seed_auth_user(db_session, "viewer@test.dev", "Viewer@1234", UserRole.VIEWER)
    return create_access_token({"sub": str(user.id), "email": user.email, "role": user.role.value})


@pytest.fixture()
def category(db_session):
    return _seed_category(db_session)
