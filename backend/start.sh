#!/usr/bin/env bash

# Start the Celery worker with concurrency restricted to 1 to save RAM
celery -A app.workers.celery_app:celery_app worker --concurrency=1 --loglevel=info &

# Start the FastAPI web server
uvicorn app.main:app --host 0.0.0.0 --port $PORT