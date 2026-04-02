from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.errors import api_error
from app.models import AuditAction, AuditLog


def log_action(
    db: Session,
    actor_id,
    action,
    entity_type: str,
    entity_id: str | None = None,
    before=None,
    after=None,
):
    action_value = action.value if hasattr(action, "value") else str(action)
    if action_value not in {member.value for member in AuditAction}:
        raise api_error("INVALID_AUDIT_ACTION", "Invalid audit action", 400)

    audit_log = AuditLog(
        actor_id=actor_id,
        action=AuditAction(action_value),
        entity_type=entity_type,
        entity_id=entity_id,
        before_data=before,
        after_data=after,
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log