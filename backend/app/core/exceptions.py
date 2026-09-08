from typing import Any, Dict, List, Optional
from fastapi import status


class AppException(Exception):
    """
    Base domain exception for all expected platform errors.
    All service and repository exceptions should inherit from this.
    """

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: str = "BAD_REQUEST",
        details: Optional[List[Dict[str, Any]]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or []


# =============================================================================
# 400 - BAD REQUEST / CLIENT STATE CONFLICTS
# =============================================================================

class BadRequestException(AppException):
    """Generic invalid client action or bad parameters."""
    def __init__(
        self,
        message: str = "Invalid request payload or state.",
        error_code: str = "BAD_REQUEST",
        details: Optional[List[Dict[str, Any]]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code=error_code,
            details=details,
        )


class InactiveUserException(AppException):
    """Account is deactivated, suspended, or archived."""
    def __init__(
        self,
        message: str = "This user account is inactive. Please contact support.",
        error_code: str = "ACCOUNT_INACTIVE",
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=error_code,
        )


# =============================================================================
# 401 - AUTHENTICATION FAILURES
# =============================================================================

class UnauthorizedException(AppException):
    """Missing, expired, or corrupted token."""
    def __init__(
        self,
        message: str = "Could not validate authentication credentials.",
        error_code: str = "UNAUTHORIZED",
        details: Optional[List[Dict[str, Any]]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=error_code,
            details=details,
        )


class InvalidCredentialsException(AppException):
    """Incorrect email or password combination."""
    def __init__(
        self,
        message: str = "Incorrect email or password.",
        error_code: str = "INVALID_CREDENTIALS",
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=error_code,
        )


class InvalidRefreshTokenException(AppException):
    """Refresh token missing, tampered, expired, or already revoked."""
    def __init__(
        self,
        message: str = "Session expired or invalid refresh token. Please sign in again.",
        error_code: str = "INVALID_REFRESH_TOKEN",
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=error_code,
        )


# =============================================================================
# 403 - AUTHORIZATION & RBAC RESTRICTIONS
# =============================================================================

class ForbiddenException(AppException):
    """User lacks the role or ownership rights to access this resource."""
    def __init__(
        self,
        message: str = "You do not have permission to perform this action.",
        error_code: str = "FORBIDDEN",
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=error_code,
        )


class RoleRequiredException(ForbiddenException):
    """User does not match the required UserRole enum."""
    def __init__(self, allowed_roles: List[str]):
        super().__init__(
            message=f"Access denied. Requires one of roles: {allowed_roles}",
            error_code="ROLE_NOT_AUTHORIZED",
        )


# =============================================================================
# 404 - RESOURCE NOT FOUND
# =============================================================================

class NotFoundException(AppException):
    """Database lookup returned no rows for a given UUID or identifier."""
    def __init__(
        self,
        resource_name: str = "Resource",
        identifier: Optional[Any] = None,
        message: Optional[str] = None,
    ):
        msg = message or (
            f"{resource_name} with identifier '{identifier}' was not found."
            if identifier
            else f"{resource_name} not found."
        )
        super().__init__(
            message=msg,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=f"{resource_name.upper()}_NOT_FOUND",
        )


# =============================================================================
# 409 - CONFLICTS & DUPLICATES
# =============================================================================

class ConflictException(AppException):
    """Violates unique constraints (e.g., duplicate email) or state transitions."""
    def __init__(
        self,
        message: str,
        error_code: str = "RESOURCE_CONFLICT",
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code=error_code,
        )



class EmailAlreadyExistsException(ConflictException):
    def __init__(self, email: str):
        super().__init__(
            message=f"An account with email '{email}' already exists.",
            error_code="EMAIL_ALREADY_EXISTS",
        )
        self.details = [{"field": "email", "message": "This email address is already registered."}]


# =============================================================================
# 422 - VALIDATION ERROR (Field-Level)
# =============================================================================

class FieldValidationException(AppException):
    """Specific field failed domain-level validation."""
    def __init__(self, field_name: str, issue: str):
        super().__init__(
            message="Validation error occurred.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            details=[{"field": field_name, "message": issue}],
        )




# Append to backend/app/core/exceptions.py

# =============================================================================
# SESSION DOMAIN EXCEPTIONS
# =============================================================================

class SessionNotFoundError(NotFoundException):
    def __init__(self, session_id: Any):
        super().__init__(
            resource_name="Session",
            identifier=str(session_id),
            message=f"Session with identifier '{session_id}' was not found.",
        )


class SessionAccessDeniedError(ForbiddenException):
    def __init__(self, message: str = "You do not have access to this session."):
        super().__init__(
            message=message,
            error_code="SESSION_ACCESS_DENIED",
        )


class InvalidSessionTimeError(BadRequestException):
    def __init__(self, message: str = "Session scheduled_start must be earlier than scheduled_end."):
        super().__init__(
            message=message,
            error_code="INVALID_SESSION_TIME",
        )


class SessionConflictError(ConflictException):
    def __init__(self, message: str = "Tutor already has an active session scheduled during this time."):
        super().__init__(
            message=message,
            error_code="SESSION_CONFLICT",
        )


class InvalidSessionTransitionError(ConflictException):
    def __init__(self, current_status: str, target_status: str):
        super().__init__(
            message=f"Cannot transition session from '{current_status}' to '{target_status}'.",
            error_code="INVALID_SESSION_TRANSITION",
        )


class SessionNotEditableError(ConflictException):
    def __init__(self, message: str = "Session details can only be edited while scheduled."):
        super().__init__(
            message=message,
            error_code="SESSION_NOT_EDITABLE",
        )



# =============================================================================
# HOMEWORK DOMAIN EXCEPTIONS
# =============================================================================

class HomeworkNotFoundError(NotFoundException):
    def __init__(self, homework_id: Any):
        super().__init__(
            resource_name="HomeworkTask",
            identifier=str(homework_id),
            message=f"Homework task '{homework_id}' was not found.",
        )


class HomeworkAccessDeniedError(ForbiddenException):
    def __init__(self, message: str = "You do not have access to this homework task."):
        super().__init__(
            message=message,
            error_code="HOMEWORK_ACCESS_DENIED",
        )


# =============================================================================
# EMAIL DOMAIN EXCEPTIONS
# =============================================================================

class EmailServiceError(AppException):
    """Base exception for email service and provider delivery failures."""

    def __init__(
        self,
        message: str = "Email delivery service encountered an error.",
        error_code: str = "EMAIL_DELIVERY_FAILED",
        details: Optional[List[Dict[str, Any]]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code=error_code,
            details=details,
        )


class EmailConfigurationError(EmailServiceError):
    """Raised when email settings (API key, sender address) are missing or invalid."""

    def __init__(
        self,
        message: str = "Email provider is not properly configured.",
        details: Optional[List[Dict[str, Any]]] = None,
    ):
        super().__init__(
            message=message,
            error_code="EMAIL_CONFIGURATION_ERROR",
            details=details,
        )


class EmailValidationError(BadRequestException):
    """Raised when an email message fails application-level payload validation."""

    def __init__(
        self,
        message: str = "Email parameters failed validation.",
        details: Optional[List[Dict[str, Any]]] = None,
    ):
        super().__init__(
            message=message,
            error_code="EMAIL_VALIDATION_ERROR",
            details=details,
        )