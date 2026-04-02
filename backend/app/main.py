from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.auth import router as auth_router
from app.core.limiter import limiter
from app.models import AuditLog, Category, RefreshToken, Transaction, User

_ = (AuditLog, Category, RefreshToken, Transaction, User)


app = FastAPI(title="Finance Dashboard API", version="1.0.0")

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(RequestValidationError)
def validation_exception_handler(_, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": {"code": "VALIDATION_ERROR", "message": "Validation failed", "errors": exc.errors()}},
    )


@app.exception_handler(Exception)
def generic_exception_handler(_, exc: Exception):
    status_code = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", None)
    if isinstance(detail, dict):
        payload = detail
    elif detail is not None:
        payload = {"code": "ERROR", "message": str(detail)}
    else:
        payload = {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred"}
    return JSONResponse(status_code=status_code, content={"detail": payload})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix="/api/v1")


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "healthy", "version": "1.0.0"}
