from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    field: Optional[str] = Field(None, description="The input field that caused the error")
    message: str = Field(..., description="Specific error description")


class ErrorResponse(BaseModel):
    error_code: str = Field(..., description="Machine-readable error identifier")
    message: str = Field(..., description="Human-readable summary message")
    status_code: int = Field(..., description="HTTP status code")
    details: Optional[List[ErrorDetail]] = Field(None, description="Field-level validation errors if applicable")