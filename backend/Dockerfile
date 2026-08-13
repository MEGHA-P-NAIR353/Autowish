FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY . .

# Expose Django port
EXPOSE 8000

# Run server script
CMD ["gunicorn", "autowish.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
