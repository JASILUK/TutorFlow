# TutorFlow

A modern, async-first tutoring and student management platform designed with Clean Architecture. TutorFlow leverages a fully containerized microservices stack to manage student pipelines, scheduling, automated notification workflows, and AI-assisted session tracking.

---

## Tech Stack

* **Backend:** FastAPI (Python 3.11), SQLAlchemy 2.0 (Async), Pydantic v2
* **Database & Cache:** PostgreSQL 16, Redis 7
* **Task Queues:** Celery (Worker orchestration for email & AI pipelines)
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, TanStack Query
* **Infrastructure:** Docker & Docker Compose

---

## Project Structure

```text
tutorflow/
├── backend/
│   ├── app/
│   │   ├── api/          # Route controllers and endpoints
│   │   ├── core/         # Settings, database session, security
│   │   ├── models/       # SQLAlchemy 2.0 ORM models
│   │   ├── schemas/      # Pydantic validation schemas
│   │   └── workers/      # Celery task definitions
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/              # React components, pages, hooks
│   ├── Dockerfile.dev
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md