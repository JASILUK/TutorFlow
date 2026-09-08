
"""
TutorFlow management CLI.

Usage:

    python -m app.cli create-admin
    python -m app.cli create-tutor

These commands are intended for:
- initial application/bootstrap setup
- local development
- manual production user provisioning

They do NOT run automatically when the application starts.
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import sys
from collections.abc import Awaitable, Callable
from typing import NoReturn

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, UserRole


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Input helpers
# ---------------------------------------------------------------------------

def fail(message: str) -> NoReturn:
    """Print a CLI error and exit."""
    print(f"Error: {message}", file=sys.stderr)
    raise SystemExit(1)


def prompt_email() -> str:
    """Read and validate an email address."""
    email = input("Email: ").strip().lower()

    if not email:
        fail("Email is required.")

    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        fail("Please enter a valid email address.")

    return email


def prompt_name() -> str:
    """Read and validate a user's full name."""
    name = input("Full name: ").strip()

    if not name:
        fail("Full name is required.")

    if len(name) > 100:
        fail("Full name must be 100 characters or fewer.")

    return name


def prompt_password() -> str:
    """
    Securely read and validate a password.

    getpass prevents the password from being displayed in the terminal.
    """
    password = getpass.getpass("Password: ")
    confirmation = getpass.getpass("Confirm password: ")

    if not password:
        fail("Password is required.")

    if len(password) < 8:
        fail("Password must be at least 8 characters.")

    if password != confirmation:
        fail("Passwords do not match.")

    return password


# ---------------------------------------------------------------------------
# User creation
# ---------------------------------------------------------------------------

async def create_user(
    *,
    email: str,
    full_name: str,
    password: str,
    role: UserRole,
) -> User:
    """Create a user if the email is not already registered."""

    async with SessionLocal() as db:
        result = await db.execute(
            select(User).where(User.email == email)
        )
        existing_user = result.scalar_one_or_none()

        if existing_user is not None:
            fail(
                f"A user with email '{email}' already exists."
            )

        user = User(
            email=email,
            full_name=full_name,
            hashed_password=get_password_hash(password),
            role=role,
            is_active=True,
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)

        return user


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

async def create_admin() -> None:
    """Create the initial TutorFlow administrator."""

    print("\nCreate TutorFlow Admin")
    print("----------------------")

    email = prompt_email()
    full_name = prompt_name()
    password = prompt_password()

    user = await create_user(
        email=email,
        full_name=full_name,
        password=password,
        role=UserRole.ADMIN,
    )

    print("\nAdmin created successfully.")
    print(f"  Name:  {user.full_name}")
    print(f"  Email: {user.email}")
    print(f"  Role:  {user.role.value}")


async def create_tutor() -> None:
    """Create a TutorFlow tutor account."""

    print("\nCreate Tutor")
    print("------------")

    email = prompt_email()
    full_name = prompt_name()
    password = prompt_password()

    user = await create_user(
        email=email,
        full_name=full_name,
        password=password,
        role=UserRole.TUTOR,
    )

    print("\nTutor created successfully.")
    print(f"  Name:  {user.full_name}")
    print(f"  Email: {user.email}")
    print(f"  Role:  {user.role.value}")


# ---------------------------------------------------------------------------
# CLI parser
# ---------------------------------------------------------------------------

CommandHandler = Callable[[], Awaitable[None]]


def build_parser() -> argparse.ArgumentParser:
    """Build the TutorFlow CLI argument parser."""

    parser = argparse.ArgumentParser(
        prog="tutorflow",
        description="TutorFlow application management CLI.",
    )

    subparsers = parser.add_subparsers(
        dest="command",
        required=True,
    )

    subparsers.add_parser(
        "create-admin",
        help="Create an administrator account.",
    )

    subparsers.add_parser(
        "create-tutor",
        help="Create a tutor account.",
    )

    return parser


async def run() -> None:
    """Parse arguments and execute the selected command."""

    parser = build_parser()
    args = parser.parse_args()

    commands: dict[str, CommandHandler] = {
        "create-admin": create_admin,
        "create-tutor": create_tutor,
    }

    handler = commands[args.command]

    try:
        await handler()
    finally:
        await engine.dispose()


def main() -> None:
    """CLI entry point."""
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        print("\nCancelled.")
        raise SystemExit(130)


if __name__ == "__main__":
    main()

