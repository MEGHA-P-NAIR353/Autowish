#!/bin/bash

echo "🚀 Starting AutoWish AI - Complete Production App"

# Start Backend
cd backend
source venv/bin/activate
echo "📦 Starting Django Backend..."
python manage.py migrate
python manage.py runserver 8000 &
BACKEND_PID=$!

sleep 3

# Start Frontend
cd ../frontend
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
