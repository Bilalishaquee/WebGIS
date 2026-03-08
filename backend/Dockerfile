# Backend only - Water Demand API
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application and bundled data
COPY app ./app
COPY data ./data
COPY scripts ./scripts

# Optional: seed at build time (comment out if you seed at runtime or via job)
# RUN python scripts/seed_sanmiguel.py || true

EXPOSE 8000

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
