from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.administration_controller import router as administration_router
from app.controllers.locker_controller import router as locker_router
from app.controllers.shipments_controller import router as shipments_router
from app.controllers.subsystems_controller import router as subsystems_router
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(subsystems_router, prefix="/api")
app.include_router(administration_router, prefix="/api")
app.include_router(shipments_router, prefix="/api")
app.include_router(locker_router, prefix="/api")
