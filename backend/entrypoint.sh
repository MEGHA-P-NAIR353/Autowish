#!/bin/sh
# =============================================================================
# Auto-Wish AI — Backend Entrypoint Script
# Shared by: backend (Django), celery_worker, celery_beat
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# 1. Wait for PostgreSQL
# -----------------------------------------------------------------------------
echo "⏳ Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
MAX_RETRIES=60
RETRIES=0
until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}" -q; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "❌ PostgreSQL did not become ready in time. Exiting."
    exit 1
  fi
  echo "   PostgreSQL not ready yet (attempt $RETRIES/$MAX_RETRIES)... retrying in 2s"
  sleep 2
done
echo "✅ PostgreSQL is ready."

# -----------------------------------------------------------------------------
# 2. Wait for Redis
# -----------------------------------------------------------------------------
echo "⏳ Waiting for Redis..."
REDIS_HOST=$(echo "${REDIS_URL:-redis://redis:6379/0}" | sed 's|redis://||' | cut -d: -f1)
REDIS_PORT=$(echo "${REDIS_URL:-redis://redis:6379/0}" | sed 's|redis://||' | cut -d: -f2 | cut -d/ -f1)
MAX_RETRIES=30
RETRIES=0
until redis-cli -h "${REDIS_HOST:-redis}" -p "${REDIS_PORT:-6379}" ping | grep -q PONG; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "❌ Redis did not become ready in time. Exiting."
    exit 1
  fi
  echo "   Redis not ready yet (attempt $RETRIES/$MAX_RETRIES)... retrying in 2s"
  sleep 2
done
echo "✅ Redis is ready."

# -----------------------------------------------------------------------------
# 3. Run database migrations (only for the backend service, not workers)
#    Workers skip migration to avoid race conditions on simultaneous startup.
# -----------------------------------------------------------------------------
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "📦 Running Django migrations..."
  python manage.py migrate --noinput
  echo "✅ Migrations complete."
fi

# -----------------------------------------------------------------------------
# 4. Collect static files (only for the backend service)
# -----------------------------------------------------------------------------
if [ "${RUN_COLLECTSTATIC:-true}" = "true" ]; then
  echo "📁 Collecting static files..."
  python manage.py collectstatic --noinput --clear 2>/dev/null || python manage.py collectstatic --noinput
  echo "✅ Static files collected."
fi

# -----------------------------------------------------------------------------
# 5. Execute the provided command (django, celery worker, celery beat, etc.)
# -----------------------------------------------------------------------------
echo "🚀 Starting: $*"
exec "$@"
