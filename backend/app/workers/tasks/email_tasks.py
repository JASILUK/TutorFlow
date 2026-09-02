from app.workers.celery_app import celery_app

@celery_app.task(name="test_email_task")
def test_email_task():
    return "Email worker ready"