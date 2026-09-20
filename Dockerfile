# Build the React frontend in a Linux Node environment.
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# Run Flask in a small Python image.
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1     PYTHONUNBUFFERED=1

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 10000

CMD ["sh", "-c", "gunicorn --chdir backend --bind 0.0.0.0:${PORT:-10000} --workers 1 --timeout 120 app:app"]
