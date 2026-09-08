# Auto-Wish AI Deployment & Environment Guide

This guide outlines how to run Auto-Wish AI across environments:
1. **Local Development (Windows PC / macOS / Linux)**
2. **Docker Compose (Local Multi-Container Development)**
3. **Railway Production Deployment (Gunicorn, 0.0.0.0:$PORT, Cloud PostgreSQL & Redis)**

---

## 1. Local Development (Windows / macOS / Linux)

Local development runs using native Python virtual environments and Vite dev servers without requiring Railway variables or Docker.

### Backend Setup (Windows PowerShell / Command Prompt)
```powershell
cd backend

# 1. Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env (defaults to SQLite if PostgreSQL/Redis not configured)
copy .env.example .env

# 4. Run migrations
python manage.py migrate

# 5. Seed initial data (optional)
python manage.py seed_all

# 6. Start Django local development server
python manage.py runserver
```
Backend runs locally at `http://127.0.0.1:8000`.

### Frontend Setup
```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```
Frontend runs locally at `http://localhost:5173`.

---

## 2. Docker Compose (Local Multi-Container Dev)

```bash
# 1. Copy root environment file
copy .env.example .env

# 2. Build and start containers
docker compose up --build
```
Services:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

---

## 3. Railway Production Deployment

In Railway production:
- **No local virtualenv is used** (uses containerized Python).
- **Django `runserver` and Vite `npm run dev` are NOT used**.
- **Backend runs via Gunicorn** bound to `0.0.0.0:$PORT`.
- **Database & Cache**: Injected automatically via Railway `DATABASE_URL` and `REDIS_URL`.

### Backend Service on Railway

1. **Create New Project on Railway**:
   - Link your GitHub repository.
   - Add a service pointing to `/backend` (or root with `railway.toml`).

2. **Add PostgreSQL & Redis Services**:
   - In Railway, click **+ New** -> **Database** -> **Add PostgreSQL**.
   - In Railway, click **+ New** -> **Database** -> **Add Redis**.
   - Railway automatically sets `DATABASE_URL` and `REDIS_URL` in your backend service variables.

3. **Backend Environment Variables on Railway**:
   Configure the following in the Railway Service Variables tab:
   - `SECRET_KEY` = `<strong-random-50-char-secret-key>`
   - `DEBUG` = `False`
   - `ALLOWED_HOSTS` = `*` (or `${{RAILWAY_PUBLIC_DOMAIN}}`)
   - `CSRF_TRUSTED_ORIGINS` = `https://${{RAILWAY_PUBLIC_DOMAIN}}`
   - `CORS_ALLOWED_ORIGINS` = `https://<your-frontend-domain>`
   - `FRONTEND_URL` = `https://<your-frontend-domain>`
   - `GEMINI_API_KEY` = `<your-gemini-api-key>`
   - `GROQ_API_KEY` = `<your-groq-api-key>`
   - `OPENROUTER_API_KEY` = `<your-openrouter-api-key>`
   - `EMAIL_HOST_USER` = `<your-smtp-email>`
   - `EMAIL_HOST_PASSWORD` = `<your-smtp-app-password>`

4. **Start Command**:
   Railway will automatically use `railway.toml` / `Dockerfile` / `Procfile`:
   ```bash
   gunicorn autowish.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120
   ```

5. **Celery Worker & Scheduler Services (Optional / Recommended for Background Wishes)**:
   - Create a second service from the same repo pointing to `/backend`.
   - Set start command:
     ```bash
     celery -A autowish worker --loglevel=info --concurrency=4
     ```
   - Create a third service for the scheduler:
     ```bash
     celery -A autowish beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
     ```

### Frontend Service on Railway / Vercel

- **On Railway**:
  - Add service pointing to `/frontend` (uses `frontend/railway.toml`).
  - Build Command: `npm run build`
  - Start Command: `npx vite preview --host 0.0.0.0 --port $PORT`
  - Set `VITE_API_URL` or `VITE_API_PROXY_TARGET` to your deployed backend URL.

- **On Vercel / Netlify (Recommended for Vite static frontend)**:
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Output directory: `dist`
