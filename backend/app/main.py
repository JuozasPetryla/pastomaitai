import asyncio
import contextlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.administration_controller import router as administration_router
from app.controllers.payment_controller import router as payment_router
from app.controllers.shipments_controller import router as shipments_router
from app.controllers.subsystems_controller import router as subsystems_router
from app.controllers.notifications_controller import router as notifications_router
from app.controllers.courier_controller import router as courier_router
from app.controllers.locker_controller import router as locker_router
from app.controllers.sticker_controller import router as sticker_router
from app.core.config import settings
from app.db.session import async_session
from app.services import notification_service

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
app.include_router(payment_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(courier_router, prefix="/api")
app.include_router(locker_router, prefix="/api")
app.include_router(sticker_router, prefix="/api")


async def _notification_sender_loop() -> None:
    while True:
        try:
            async with async_session() as session:
                await notification_service.send_unsent_sms_messages(session)
                await notification_service.send_unsent_email_messages(session)
        except Exception:
            pass

        await asyncio.sleep(10)


@app.on_event("startup")
async def start_notification_sender() -> None:
    app.state.notification_sender_task = asyncio.create_task(_notification_sender_loop())


@app.on_event("shutdown")
async def stop_notification_sender() -> None:
    task = getattr(app.state, "notification_sender_task", None)
    if task is not None:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
