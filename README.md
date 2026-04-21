# Pastomatai

Minimal development scaffold for the parcel-locker system from the provided use-case diagram.

## Stack

- Backend: Python, FastAPI, SQLAlchemy async support, Postgres driver
- Frontend: React with Vite
- Database: PostgreSQL via Docker Compose

## Project Layout

```text
backend/app/controllers/  MVC controllers, implemented as FastAPI routers
backend/app/models/       MVC models, implemented as SQLAlchemy/domain models
backend/app/schemas/      Request and response DTOs
backend/app/services/     Business/application logic used by controllers
frontend/src/views/       MVC views, implemented as React page components
frontend/src/components/  Reusable UI components used by views
frontend/src/models/      Frontend model types
frontend/src/api/         API clients
docker-compose.yml        PostgreSQL service
.env.example              Development environment defaults
```

More architecture detail is documented in `docs/architecture/mvc.md`.

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

Apply database migrations from the `backend/` directory:

```bash
alembic upgrade head
```

Check the applied migration version:

```bash
alembic current
```

Create a new migration after schema changes:

```bash
alembic revision -m "describe change"
```

Create a new migration from SQLAlchemy model changes:

```bash
alembic revision --autogenerate -m "describe change"
```

4. Frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:5173` and the API to `http://localhost:8000`.

## Database

The initial PostgreSQL DDL is available in `docs/database/001_initial_schema.sql`.
Alembic applies the same schema through `backend/migrations/versions/20260421_0001_initial_schema.py`.

The initial migration creates these tables:

```text
asmenys
siuntejai
gavejai
darbuotojai
pastomatai
pastomato_skyriai
siuntos
pranesimai
```
