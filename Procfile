web: cd backend && gunicorn autowish.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120 --access-logfile - --error-logfile -
worker: cd backend && celery -A autowish worker --loglevel=info --concurrency=4
beat: cd backend && celery -A autowish beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
