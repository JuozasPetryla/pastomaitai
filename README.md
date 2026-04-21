# Pastomatai

Minimal development scaffold for the parcel-locker system from the provided use-case diagram.

## Stack

- Backend: Python, FastAPI, SQLAlchemy async support, Postgres driver
- Frontend: React with Vite
- Database: PostgreSQL via Docker Compose

## Project Layout

```text
backend/    FastAPI API skeleton
frontend/   React UI skeleton with subsystem navigation
docker-compose.yml
.env.example
```

## Start Development

1. Copy environment defaults:

```bash
cp .env.example .env
```

2. Start Postgres:

```bash
docker compose up -d postgres
```

3. Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

4. Frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:5173` and the API to `http://localhost:8000`.
