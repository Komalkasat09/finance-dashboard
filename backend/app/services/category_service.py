from sqlalchemy.orm import Session

from app.models import Category


def list_categories(db: Session) -> list[Category]:
    return db.query(Category).order_by(Category.name.asc()).all()
