"""Template rendering service for TutorFlow HTML emails."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping

from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, ConfigDict, Field

# Base templates directory (backend/app/templates)
TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "templates"


class SessionScheduledEmailData(BaseModel):
    """Clean, pre-formatted presentation context for session notification emails."""

    model_config = ConfigDict(frozen=True)

    student_name: str = Field(..., min_length=1, description="Recipient student's full name.")
    tutor_name: str = Field(..., min_length=1, description="Assigned tutor's full name.")
    topic: str = Field(..., min_length=1, description="Lesson topic or academic objective.")
    scheduled_date: str = Field(..., min_length=1, description="Formatted date string (e.g., 'September 8, 2026').")
    scheduled_start_time: str = Field(..., min_length=1, description="Formatted start time (e.g., '4:00 PM').")
    scheduled_end_time: str = Field(..., min_length=1, description="Formatted end time (e.g., '5:00 PM').")
    meeting_url: str | None = Field(default=None, description="Direct video meeting link, if configured.")


class StudentAccountCreatedEmailData(BaseModel):
    """Clean presentation context for student invitation and initial credentials email."""

    model_config = ConfigDict(frozen=True)

    student_name: str = Field(..., min_length=1, description="Student's display name.")
    student_email: str = Field(..., min_length=1, description="Student login email.")
    temporary_password: str = Field(..., min_length=1, description="Initial temporary plain password.")
    login_url: str = Field(..., min_length=1, description="Direct link to the frontend login page.")


class EmailTemplateRenderer:
    """Renders Jinja2 HTML email templates with strict autoescaping."""

    def __init__(self, template_dir: Path | str | None = None) -> None:
        base_dir = Path(template_dir) if template_dir else TEMPLATES_DIR
        self._env = Environment(
            loader=FileSystemLoader(str(base_dir)),
            autoescape=select_autoescape(
                enabled_extensions=("html", "xml"),
                default_for_string=True,
            ),
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def render(self, template_name: str, context: Mapping[str, Any]) -> str:
        """Load and render an HTML template with the provided context dictionary."""
        template = self._env.get_template(template_name)
        return template.render(context)

    def render_session_scheduled(self, data: SessionScheduledEmailData) -> str:
        """Type-safe convenience helper to render the session scheduled email."""
        return self.render("email/session_scheduled.html", data.model_dump())

    def render_student_account_created(self, data: StudentAccountCreatedEmailData) -> str:
        """Type-safe convenience helper to render the student account invitation email."""
        return self.render("email/student_account_created.html", data.model_dump())