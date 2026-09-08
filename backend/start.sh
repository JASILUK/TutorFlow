#!/usr/bin/env bash

# Start the Celery worker in the background
celery -A app.workers.celery_app:celery_app worker --loglevel=info &

# Start the FastAPI web server
uvicorn app.main:app --host 0.0.0.0 --port $PORT