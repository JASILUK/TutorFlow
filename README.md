# TutorFlow

TutorFlow is a production-ready, full-stack platform built for tutors and educational institutions to manage students, track academic progress, generate AI-powered lesson plans, sync sessions with Google Calendar, and execute background tasks asynchronously.

---

##  Demo Accounts

Explore the live platform immediately using these pre-configured test credentials:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Tutor / Admin** | `mohdjasil2004@gmail.com` | `jasil123` |
| **Student** | `jasil4official@gmail.com` | `jaeem123` |

---

##  Key Features

* **Role-Based Workflows:** Tailored dashboards for Tutors and Students.
* **AI Lesson Planning:** Integrated AI tools to draft customized lesson plans and review student performance.
* **Asynchronous Processing:** Celery workers powered by Redis handle background jobs (such as notifications and heavy tasks) without blocking the main API thread.
* **Google Calendar Integration:** Secure OAuth-based connection allowing tutors to auto-sync tutoring sessions directly to their Google Calendar.
* **Secure Session Architecture:** In-memory token storage paired with `HttpOnly` refresh cookies for high resistance against XSS attacks.

---

##  Tech Stack

* **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, TanStack React Query, Zod, React Router v7.
* **Backend:** FastAPI, Python 3.11+, SQLAlchemy (Async), PostgreSQL.
* **Task Queue:** Celery & Redis.
* **Deployment:** Vercel (Frontend) & Render (Backend Web Service & Celery Worker).

---

##  Local Development Setup

Run TutorFlow locally using Docker Compose by following these steps:

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/JASILUK/TutorFlow.git](https://github.com/JASILUK/TutorFlow.git)
   cd TutorFlow