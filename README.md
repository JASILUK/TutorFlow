# TutorFlow

TutorFlow is a production-ready, full-stack platform built for tutors and educational institutions to manage students, track academic progress, generate context-aware AI lesson plans, sync sessions with Google Calendar, and execute background tasks asynchronously.

---

##  Demo Accounts

Explore the live platform immediately using these pre-configured test credentials:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Tutor / Admin** | `mohdjasil2004@gmail.com` | `jasil123` |
| **Student** | `jasil4official@gmail.com` | `jaeem123` |

---

##  Key Features & Architecture

* **Server-Enforced Session Lifecycle:** Strict state machine enforcement (`Scheduled` → `In Progress` → `Completed` → `AI Reviewed`) managed securely on the backend, preventing state-skipping or double-booking.
* **Context-Aware AI Integration:** Powered by Google Gemini, utilizing real student profiles, current levels, weak areas, and historical session data across three touchpoints:
  1. *Pre-Session Plan:* Custom objectives, outlines, and targeted practice questions.
  2. *Post-Session Debrief:* Synthesized raw tutor notes into structured summaries, homework, and next focus areas.
  3. *Progress Summary:* Aggregated insights tracking long-term student growth.
* **Role-Based Workflows:** Distinct dashboards tailored for Tutors (management, scheduling, AI tools) and Students (upcoming sessions, read-only notes, homework tracking).
* **Asynchronous Processing:** Celery workers powered by Redis handle background operations without blocking the main API thread.
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