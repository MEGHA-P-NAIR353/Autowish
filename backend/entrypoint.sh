#!/bin/sh
# =============================================================================
# Auto-Wish AI — Backend Entrypoint Script
# Shared by: backend (Gunicorn / Django), celery_worker, celery_beat
# =============================================================================

set -e

# -----------------------------------------------------------------------------
# 1. Wait for PostgreSQL (if PostgreSQL is configured)
# -----------------------------------------------------------------------------
CHECK_PG=false
PG_TARGET_HOST=""
PG_TARGET_PORT="5432"
PG_TARGET_USER="postgres"

if [ -n "$DATABASE_URL" ]; then
  # Parse DATABASE_URL (e.g., postgresql://user:pass@host:5432/dbname)
  case "$DATABASE_URL" in
    *postgres*|*psql*)
      CHECK_PG=true
      PROTO_REMOVED=$(echo "$DATABASE_URL" | sed -e 's|^[^:]*://||')
      USER_PASS=$(echo "$PROTO_REMOVED" | grep '@' | cut -d@ -f1 || true)
      if [ -n "$USER_PASS" ]; then
        PG_TARGET_USER=$(echo "$USER_PASS" | cut -d: -f1)
        HOST_PORT_DB=$(echo "$PROTO_REMOVED" | cut -d@ -f2)
      else
        HOST_PORT_DB="$PROTO_REMOVED"
      fi
      PG_TARGET_HOST=$(echo "$HOST_PORT_DB" | cut -d/ -f1 | cut -d: -f1)
      PARSED_PORT=$(echo "$HOST_PORT_DB" | cut -d/ -f1 | grep ':' | cut -d: -f2 || true)
      if [ -n "$PARSED_PORT" ]; then
        PG_TARGET_PORT="$PARSED_PORT"
      fi
      ;;
  esac
elif [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ]; then
  CHECK_PG=true
  PG_TARGET_HOST="$DB_HOST"
  PG_TARGET_PORT="${DB_PORT:-5432}"
  PG_TARGET_USER="${DB_USER:-postgres}"
fi

if [ "$CHECK_PG" = "true" ] && [ -n "$PG_TARGET_HOST" ]; then
  echo "⏳ Waiting for PostgreSQL at ${PG_TARGET_HOST}:${PG_TARGET_PORT}..."
  MAX_RETRIES=30
  RETRIES=0
  until pg_isready -h "$PG_TARGET_HOST" -p "$PG_TARGET_PORT" -U "$PG_TARGET_USER" -q; do
    RETRIES=$((RETRIES + 1))
    if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
      echo "⚠️ PostgreSQL wait timed out. Continuing startup..."
      break
    fi
    echo "   PostgreSQL not ready yet (attempt $RETRIES/$MAX_RETRIES)... retrying in 2s"
    sleep 2
  done
  if [ "$RETRIES" -lt "$MAX_RETRIES" ]; then
    echo "✅ PostgreSQL is ready."
  fi
fi

# -----------------------------------------------------------------------------
# 2. Wait for Redis (if Redis is configured and not eager)
# -----------------------------------------------------------------------------
TARGET_REDIS_URL="${REDIS_URL:-$CELERY_BROKER_URL}"
if [ -n "$TARGET_REDIS_URL" ] && [ "$CELERY_TASK_ALWAYS_EAGER" != "True" ] && [ "$CELERY_TASK_ALWAYS_EAGER" != "true" ]; then
  REDIS_HOST=$(echo "$TARGET_REDIS_URL" | sed -e 's|^[^:]*://||' | cut -d@ -f2 | cut -d/ -f1 | cut -d: -f1)
  [ -z "$REDIS_HOST" ] && REDIS_HOST=$(echo "$TARGET_REDIS_URL" | sed -e 's|^[^:]*://||' | cut -d/ -f1 | cut -d: -f1)
  REDIS_PORT=$(echo "$TARGET_REDIS_URL" | sed -e 's|^[^:]*://||' | cut -d@ -f2 | cut -d/ -f1 | grep ':' | cut -d: -f2 || true)
  [ -z "$REDIS_PORT" ] && REDIS_PORT=$(echo "$TARGET_REDIS_URL" | sed -e 's|^[^:]*://||' | cut -d/ -f1 | grep ':' | cut -d: -f2 || true)
  REDIS_PORT="${REDIS_PORT:-6379}"

  if [ -n "$REDIS_HOST" ] && [ "$REDIS_HOST" != "127.0.0.1" ] && [ "$REDIS_HOST" != "localhost" ]; then
    echo "⏳ Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT}..."
    MAX_RETRIES=20
    RETRIES=0
    until redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q PONG; do
      RETRIES=$((RETRIES + 1))
      if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
        echo "⚠️ Redis wait timed out. Continuing startup..."
        break
      fi
      echo "   Redis not ready yet (attempt $RETRIES/$MAX_RETRIES)... retrying in 2s"
      sleep 2
    done
    if [ "$RETRIES" -lt "$MAX_RETRIES" ]; then
      echo "✅ Redis is ready."
    fi
  fi
fi

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
# 5. Execute the provided command (Gunicorn, Celery worker, Celery beat, etc.)
# -----------------------------------------------------------------------------
echo "🚀 Starting: $*"
exec "$@"
