#!/bin/bash

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting AutoWish AI - Complete Production App"

# Start Backend
cd "$ROOT_DIR/backend"

if [ -f "$ROOT_DIR/backend/venv/Scripts/activate" ]; then
	source "$ROOT_DIR/backend/venv/Scripts/activate"
elif [ -f "$ROOT_DIR/backend/venv/bin/activate" ]; then
	source "$ROOT_DIR/backend/venv/bin/activate"
elif [ -f "$ROOT_DIR/.venv/Scripts/activate" ]; then
	source "$ROOT_DIR/.venv/Scripts/activate"
elif [ -f "$ROOT_DIR/.venv/bin/activate" ]; then
	source "$ROOT_DIR/.venv/bin/activate"
else
	echo "Warning: no virtual environment found; using the system Python."
fi

echo "📦 Starting Django Backend..."
python manage.py migrate
python manage.py runserver 8000 &
BACKEND_PID=$!

sleep 3

# Start Frontend
cd "$ROOT_DIR/frontend"
echo "🌐 Starting React Frontend..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ AutoWish AI is running!"
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000"
echo "Admin:    http://localhost:8000/admin"
echo ""
echo "Demo Login: sarah@autowish.ai / demo1234"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
