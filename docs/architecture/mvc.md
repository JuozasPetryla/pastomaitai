# MVC Architecture

This project uses MVC as the required architecture.

## Backend Mapping

```text
backend/app/controllers/  Controllers: FastAPI route handlers
backend/app/models/       Models: SQLAlchemy entities and database-facing domain objects
backend/app/schemas/      DTOs: request and response objects used by controllers
backend/app/services/     Application logic called by controllers
backend/app/db/           Database session and infrastructure
backend/app/core/         Shared configuration
```

Controller flow:

```text
HTTP request -> controller -> service -> model/database -> schema response
```

Alembic imports `app.models.Base.metadata`, so future migrations can be generated from
the SQLAlchemy models with:

```bash
cd backend
alembic revision --autogenerate -m "describe change"
```

## Frontend Mapping

```text
frontend/src/views/       Views: page-level React UI
frontend/src/components/  Reusable view components
frontend/src/models/      Frontend model types and local catalog data
frontend/src/api/         API client functions
```

Frontend flow:

```text
View -> component -> API client -> backend controller
```

## Feature Placement

- Shipment registration and pickup: `shipments_controller.py`, `shipment_service.py`, `siunta.py`
- Parcel locker administration: `administration_controller.py`, `administration_service.py`, `pastomatas.py`
- Courier workflows: `courier_controller.py`, `courier_service.py`
- Notifications: `notifications_controller.py`, `notification_service.py`, `pranesimas.py`
- Labels: `labels_controller.py`, `label_service.py`
