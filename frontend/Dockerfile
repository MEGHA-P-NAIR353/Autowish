# =============================================================================
# Auto-Wish AI — Frontend Dockerfile
# Node 20 LTS / React 19 / Vite 8 — Development mode with hot-reload
# =============================================================================

FROM node:20-alpine

# Vite dev server needs the host set to 0.0.0.0 to be reachable inside Docker.
ENV HOST=0.0.0.0

WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
# Copy lockfiles first so Docker can cache the npm install layer separately.
# This means dependency re-install only happens when package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# ── Copy source ───────────────────────────────────────────────────────────────
COPY . .

# ── Expose Vite dev port ──────────────────────────────────────────────────────
EXPOSE 5173

# ── Start Vite dev server bound to all interfaces ─────────────────────────────
# --host 0.0.0.0  — makes Vite listen on all network interfaces inside the container
# VITE_API_PROXY_TARGET is set by docker-compose.yml to http://backend:8000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
