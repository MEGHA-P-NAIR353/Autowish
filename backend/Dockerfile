# =============================================================================
# Auto-Wish AI — Backend Dockerfile
# Python 3.12 / Django / Celery
# Shared image for: backend, celery_worker, celery_beat
# =============================================================================

FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system dependencies:
#   - libpq-dev   : PostgreSQL client headers (needed by psycopg2)
#   - postgresql-client : provides pg_isready for the entrypoint wait logic
#   - redis-tools : provides redis-cli for the entrypoint wait logic
#   - build-essential : compilers needed by some pip packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install Python dependencies ───────────────────────────────────────────────
# Copy requirements first so Docker can cache this layer separately from source.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Copy application source ───────────────────────────────────────────────────
COPY . .

# ── Entrypoint ────────────────────────────────────────────────────────────────
# Make the entrypoint executable and set it as the container entrypoint.
# Each service overrides CMD in docker-compose.yml.
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]

# Default command — runs the Django dev server.
# docker-compose.yml overrides this per service.
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
