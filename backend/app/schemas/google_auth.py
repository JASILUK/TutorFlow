"""Pydantic schemas for Google OAuth connection status."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class GoogleConnectionStatusResponse(BaseModel):
    """Response model indicating whether a user has connected their Google account."""
    model_config = ConfigDict(from_attributes=True)

    connected: bool = Field(..., description="True if valid Google OAuth tokens exist.")
    email: Optional[str] = Field(None, description="Email of the connected Google account.")
    expires_at: Optional[datetime] = Field(None, description="Token expiration timestamp.")