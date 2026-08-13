# Auto-Wish AI Deployment Guide

This guide describes how to run and deploy the enterprise-grade Auto-Wish AI platform in production using Docker Compose or manually.

---

## 1. Prerequisites
- Docker & Docker Compose
- Node.js v18+ & npm (if manual frontend run)
- Python 3.12 & PostgreSQL 15+ (if manual backend run)
- Redis server v7+ (for Celery broker)

---

## 2. Docker Compose Deployment (Recommended)

1. Clone or navigate to the project directory:
   ```bash
   cd g:/Ai-wisher/home/user
   ```
2. Build the production build of the React frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   cd ..
   ```
3. Spin up all containers in detached mode:
   ```bash
   docker-compose up -d --build
   ```
4. Verify all services are running and healthy:
   ```bash
   docker-compose ps
   ```
5. Apply database migrations:
   ```bash
   docker-compose exec web python manage.py migrate
   ```
6. Seed default data and admin:
   ```bash
   docker-compose exec web python manage.py seed_all
   ```

---

## 3. Manual Local Run (Development / Debugging)

### Redis & PostgreSQL
Ensure PostgreSQL is active on port `5432` with a database named `autowish_db`.
Ensure Redis is active on port `6379`.

### Backend Service
1. Navigate to the backend folder, create a virtual environment, and install dependencies:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Run database migrations:
   ```bash
   python manage.py migrate
   ```
3. Seed default data:
   ```bash
   python manage.py seed_all
   ```
4. Start the Django development server:
   ```bash
   python manage.py runserver
   ```
5. In a separate terminal, start the Celery worker:
   ```bash
   celery -A autowish worker --loglevel=info
   ```
6. In a separate terminal, start the Celery beat scheduler:
   ```bash
   celery -A autowish beat --loglevel=info
   ```

### Frontend Service
1. Navigate to the frontend folder, install dependencies, and start Vite dev server:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open `http://localhost:5173` in your browser.
