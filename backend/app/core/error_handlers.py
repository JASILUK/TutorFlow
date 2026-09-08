import logging
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppException

logger = logging.getLogger("tutorflow.errors")


def register_error_handlers(app: FastAPI) -> None:
    """Registers global exception handlers across the FastAPI application."""

    # 1. Custom Domain Exceptions (AppException & all its subclasses)
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error_code": exc.error_code,
                "message": exc.message,
                "status_code": exc.status_code,
                "details": exc.details if exc.details else None,
            },
        )

    # 2. Pydantic Request Validation Errors (HTTP 422)
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        parsed_errors = []
        for error in exc.errors():
            location = error.get("loc", [])
            # Target the specific field name (e.g., 'email' from ('body', 'email'))
            field_name = str(location[-1]) if location else "unknown"
            parsed_errors.append(
                {
                    "field": field_name,
                    "message": error.get("msg", "Invalid value"),
                }
            )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error_code": "VALIDATION_ERROR",
                "message": "Input validation failed. Please check the marked fields.",
                "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "details": parsed_errors,
            },
        )

    # 3. Built-in FastAPI / Starlette HTTP Exceptions (404 Not Found, 405 Method Not Allowed)
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error_code": f"HTTP_{exc.status_code}",
                "message": exc.detail if isinstance(exc.detail, str) else "An error occurred.",
                "status_code": exc.status_code,
                "details": None,
            },
        )

    # 4. PostgreSQL Database Constraint Conflicts (HTTP 409)
    @app.exception_handler(IntegrityError)
    async def sqlalchemy_integrity_handler(
        request: Request, exc: IntegrityError
    ) -> JSONResponse:
        logger.warning(f"Database integrity violation at {request.url.path}: {exc}")
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error_code": "DB_INTEGRITY_CONFLICT",
                "message": "A database constraint was violated (duplicate record or conflicting state).",
                "status_code": status.HTTP_409_CONFLICT,
                "details": None,
            },
        )

    # 5. Fallback for Unhandled Server Crashes (HTTP 500)
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception(f"Unhandled server error at {request.url.path}: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error_code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please try again later.",
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "details": None,
            },
        )