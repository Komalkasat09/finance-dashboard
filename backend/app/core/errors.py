from fastapi import HTTPException, status


def api_error(code: str, message: str, status_code: int) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


def unauthorized(code: str, message: str = "Authentication required") -> HTTPException:
    return api_error(code, message, status.HTTP_401_UNAUTHORIZED)


def forbidden(code: str, message: str = "Insufficient permissions") -> HTTPException:
    return api_error(code, message, status.HTTP_403_FORBIDDEN)