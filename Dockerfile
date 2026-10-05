FROM node:22-bookworm-slim AS interface
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY scripts/init_database.py scripts/init_database.py
COPY scripts/cloud_start.py scripts/cloud_start.py
COPY scripts/create_admin.py scripts/create_admin.py
COPY scripts/backup.py scripts/backup.py
COPY --from=interface /app/frontend/build frontend/build
RUN useradd --create-home appuser && mkdir -p backend/uploads && chown -R appuser:appuser /app
USER appuser
ENV PORT=10000
EXPOSE 10000
CMD ["python", "scripts/cloud_start.py"]
