# Finance Dashboard
Role-aware financial operations platform for transactions, analytics, and governance.

## What This Project Solves
Finance teams need one place to track financial activity, enforce role-based controls, and explain who changed what and when. This project provides that with a clean full-stack implementation: a FastAPI backend with explicit service boundaries and a Next.js frontend with role-aware UX. It is designed to be easy to review, reproducible to run, and realistic enough to demonstrate production-minded engineering decisions.

## Quick Start
```bash
git clone ... && cd finance-dashboard
cp backend/.env.example backend/.env
docker compose up --build
```

In a separate terminal:
```bash
docker compose exec backend python seed.py
```

## Demo Credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@finance.dev | Admin@1234 |
| Analyst | analyst@finance.dev | Analyst@1234 |
| Viewer | viewer@finance.dev | Viewer@1234 |

## Architecture Overview
The backend is layered as routes -> services -> models to separate transport logic from business logic and persistence concerns. Routes parse inputs, attach dependencies, and return typed responses. Services enforce role rules, coordinate multi-entity writes, and keep mutation logic centralized for easier testing. Models represent database structure and relations with explicit SQLAlchemy 2.0 behavior. This architecture keeps the API maintainable as feature count grows and reduces coupling across modules.

## Backend Deep Dive

### Request Lifecycle
1. Request enters FastAPI and passes middleware (CORS, rate limiting).
2. Route-level dependencies authenticate user and enforce minimum role.
3. Pydantic schemas validate and normalize request payloads.
4. Route delegates to service layer for business logic and side effects.
5. Service reads/writes SQLAlchemy models and commits transactional changes.
6. Standardized response payload (or structured error) is returned to client.

### Module Responsibilities
- API routes: endpoint definitions, query/path/body parsing, dependency wiring.
- Core: shared config, DB session factory, auth helpers, error formatting, rate limiter setup.
- Services: domain use-cases (auth, transactions, analytics, user management, audit logging).
- Models: table definitions and enums for users, transactions, categories, refresh tokens, audit logs.
- Schemas: strict request/response contracts used by FastAPI and OpenAPI docs.

### Security and Access Model
- JWT access tokens are short-lived for request authentication.
- Refresh tokens are stored as hashes and rotated on refresh.
- Role gates are enforced in backend dependencies, not only in frontend UI.
- Sensitive endpoints (login/register and high-traffic data endpoints) are rate-limited.
- Password changes require old password verification.

### Data Integrity and Auditability
- Transactions use soft delete to preserve historical financial traceability.
- Critical actions are logged to audit_logs for accountability.
- Enum-driven roles and transaction types reduce invalid state risk.
- Service-layer validation ensures category, ownership, and role constraints are consistently applied.

### Why This Backend Is Reviewer-Friendly
- Thin controllers and explicit service methods make code-paths easy to follow.
- Deterministic seed script provides immediate test data and known credentials.
- Pytest suite validates auth, RBAC, and analytics behaviors.
- Swagger docs are generated from source-of-truth schemas and routes.

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
| POST | /api/v1/auth/register | Any | Register a new account with default VIEWER role |
| POST | /api/v1/auth/login | Any | Issue access and refresh tokens |
| POST | /api/v1/auth/refresh | Any | Rotate refresh token and return a fresh token pair |
| POST | /api/v1/auth/logout | VIEWER | Revoke the provided refresh token |
| GET | /api/v1/auth/me | VIEWER | Return the authenticated user profile |

### Transactions
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/v1/transactions | VIEWER | List transactions with paging and filters |
| POST | /api/v1/transactions | ANALYST | Create a transaction |
| GET | /api/v1/transactions/export | ANALYST | Export filtered transaction data as CSV |
| GET | /api/v1/transactions/{transaction_id} | VIEWER | Fetch a single transaction |
| PUT | /api/v1/transactions/{transaction_id} | ANALYST | Update a transaction |
| DELETE | /api/v1/transactions/{transaction_id} | ADMIN | Soft-delete a transaction |
| POST | /api/v1/transactions/{transaction_id}/restore | ADMIN | Restore a soft-deleted transaction |

### Analytics
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/v1/analytics/dashboard | VIEWER | Return summary KPIs, monthly trend, category breakdown, and recent activity |

### Users
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/v1/users | ADMIN | List users with pagination |
| GET | /api/v1/users/{user_id} | ADMIN | Get one user record |
| PUT | /api/v1/users/{user_id} | ADMIN | Update role and active status |
| POST | /api/v1/users/me/change-password | VIEWER | Change current user password |

### Categories
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/v1/categories | VIEWER | List transaction categories for filter/form use |

## Database Schema Diagram
```text
                    +--------------------+
                    |       users        |
                    |--------------------|
                    | id (PK)            |
                    | email (UNIQUE)     |
                    | role               |
                    | is_active          |
                    +---------+----------+
                              ^
                              | user_id / created_by / actor_id

+--------------------+    +---+----------------+    +--------------------+
|   refresh_tokens   |    |    transactions    |    |     audit_logs     |
|--------------------|    |--------------------|    |--------------------|
| id (PK)            |    | id (PK)            |    | id (PK)            |
| user_id (FK users) |    | user_id (FK users) |    | actor_id (FK users)|
| token_hash         |    | created_by (FK)    |    | action             |
| expires_at         |    | category_id (FK)   |    | entity_type        |
| revoked            |    | amount, type, date |    | entity_id          |
+--------------------+    +---------+----------+    +--------------------+
                                     |
                                     | category_id
                                     v
                          +----------------------+
                          |      categories      |
                          |----------------------|
                          | id (PK)              |
                          | name (UNIQUE)        |
                          | color_hex, icon      |
                          +----------------------+
```

## Key Design Decisions
- Financial records use soft delete so historical ledgers remain recoverable and audit-safe instead of being physically removed.
- JWT refresh token rotation is enforced to limit replay windows and allow immediate invalidation of prior refresh artifacts.
- Audit logs are first-class domain data to provide an accountability trail for security, debugging, and compliance review.
- Pydantic v2 is used for strict, typed request/response contracts with fast validation and predictable error surfaces.
- SQLAlchemy 2.0 style keeps query intent explicit and avoids legacy implicit behaviors that are harder to test.
- A deterministic seed script exists to reduce reviewer setup friction and guarantee reproducible demo data.

## Assumptions Made
- New self-registered users are created as VIEWER by default; elevated roles are administrative decisions.
- VIEWER users can read dashboard and transactions but cannot mutate transaction data.
- Category management is currently read-only in API surface; categories are seeded and consumed by transactions and filters.
- Auth endpoints are rate-limited per IP and tests may relax limiter behavior in isolated test fixtures.

## Running Tests
```bash
docker compose exec backend pytest tests/
