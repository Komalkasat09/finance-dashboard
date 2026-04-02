from __future__ import annotations

import uuid

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    color_hex: Mapped[str] = mapped_column(String(16), nullable=False)
    icon: Mapped[str] = mapped_column(String(100), nullable=False)

    def __repr__(self) -> str:
        return f"Category(id={self.id!s}, name={self.name!r})"