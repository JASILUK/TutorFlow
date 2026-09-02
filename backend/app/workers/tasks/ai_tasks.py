from app.workers.celery_app import celery_app

@celery_app.task(name="test_ai_task")
def test_ai_task():
    return "AI worker ready"