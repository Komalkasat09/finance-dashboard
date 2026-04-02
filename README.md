# Finance Dashboard
A full-stack finance operations dashboard with role-based access, auditability, analytics, and transaction governance.

## Quick Start
```bash
git clone ... && cd finance-dashboard
cp backend/.env.example backend/.env
docker compose up --build
# In a separate terminal:
docker compose exec backend python seed.py
```

## Demo Credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@finance.dev | Admin@1234 |
| Analyst | analyst@finance.dev | Analyst@1234 |
| Viewer | viewer@finance.dev | Viewer@1234 |

## Architecture Overview
The backend follows a layered architecture: API routes handle transport concerns, services implement business logic, and SQLAlchemy models represent persisted entities. This structure keeps endpoint handlers thin, makes authorization and validation policies composable, and supports deterministic unit and integration tests. Audit logging and token rotation are centralized in service utilities, so every state mutation has a traceable path. The frontend consumes the API through a single Axios client with token refresh logic and typed domain models.

## Role Permission Matrix
| Action | VIEWER | ANALYST | ADMIN |
|---|---|---|---|
| View Dashboard | ✅ | ✅ | ✅ |
| View Transactions | ✅ | ✅ | ✅ |
| Create Transaction | ❌ | ✅ | ✅ |
| Edit Transaction | ❌ | ✅ | ✅ |
| Delete Transaction | ❌ | ❌ | ✅ |
| Export CSV | ❌ | ✅ | ✅ |
| View Users | ❌ | ❌ | ✅ |
| Manage Users | ❌ | ❌ | ✅ |
| Change Own Password | ✅ | ✅ | ✅ |

## API Reference

### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/v1/auth/register | Any | Register a new user account |
| POST | /api/v1/auth/login | Any | Authenticate and issue access/refresh tokens |
| POST | /api/v1/auth/refresh | Any | Rotate refresh token and issue a new token pair |
| POST | /api/v1/auth/logout | Any authenticated | Revoke a refresh token |
| GET | /api/v1/auth/me | Any authenticated | Return current authenticated user |

### Transactions
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/v1/transactions | VIEWER | List transactions with pagination and filters |
| POST | /api/v1/transactions | ANALYST | Create a transaction |
| GET | /api/v1/transactions/export | ANALYST | Export filtered transactions as CSV |
| GET | /api/v1/transactions/{id} | VIEWER | Get one transaction |
| PUT | /api/v1/transactions/{id} | ANALYST | Update one transaction |
| DELETE | /api/v1/transactions/{id} | ADMIN | Soft-delete a transaction |
| POST | /api/v1/transactions/{id}/restore | ADMIN | Restore a soft-deleted transaction |

### Analytics
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/v1/analytics/dashboard | VIEWER | Return dashboard summary, trend, category mix, and recent activity |

### Users
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/v1/users | ADMIN | List users |
| GET | /api/v1/users/{id} | ADMIN | Get one user |
| PUT | /api/v1/users/{id} | ADMIN | Update user role, status, or profile |
| POST | /api/v1/users/me/change-password | Any authenticated | Change current user password |

## Database Schema Diagram
```text
users
	id (PK)
	email (UNIQUE)
	role
	...
	 ^
	 | user_id, created_by, actor_id
	 |
transactions -----------------> categories
	id (PK)                       id (PK)
	user_id (FK -> users.id)      name (UNIQUE)
	created_by (FK -> users.id)
	category_id (FK -> categories.id)
	...

refresh_tokens
	id (PK)
	user_id (FK -> users.id)
	token_hash

audit_logs
	id (PK)
	actor_id (FK -> users.id, nullable)
	action
	entity_type
	entity_id
```

## Key Design Decisions
- Soft deletes are used for transactions to preserve financial history and support compliance-grade recovery.
- JWT access + refresh token rotation reduces replay risk and allows controlled long-lived sessions.
- Audit logs are written on all critical mutations to maintain an accountability trail.
- Pydantic v2 provides fast validation and typed API contracts with deterministic parsing behavior.
- SQLAlchemy 2.0-style models/services keep query behavior explicit and testable.
- The seed script optimizes reviewer experience with deterministic credentials and realistic data distribution.

## Assumptions Made
- Transaction ownership is represented by the authenticated actor; viewers can read all transactions but cannot mutate.
- Category assignment in frontend forms is name-driven until category management endpoints are introduced.
- Dashboard category breakdown is expense-focused by design to align with spending analysis.
- Test harness disables API rate limiting to avoid false negatives from repeated loopback requests.

## Running Tests
```bash
docker compose exec backend pytest tests/ -v
```

## API Docs
Interactive Swagger documentation is available at http://localhost:8000/docs
