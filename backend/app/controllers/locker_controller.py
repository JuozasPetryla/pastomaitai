from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.pastomatas import (
    LockerActionResponse,
    LockerRegistrationRequest,
    LockerSendRequest,
    LockerShipmentCodeRequest,
    LockerStateResponse,
)
from app.services.locker_service import (
    close_locker_doors,
    get_locker_state,
    mark_shipment_delivered_to_locker,
    open_pickup_locker,
    open_send_locker,
    pay_shipment_at_locker,
    register_shipment_at_locker,
)

router = APIRouter(prefix="/lockers", tags=["lockers"])
session_dependency = Depends(get_session)


@router.get("/demo", response_model=LockerStateResponse)
async def get_demo_locker_state(
    session: AsyncSession = session_dependency,
) -> LockerStateResponse:
    return await get_locker_state(session)


@router.post("/demo/register", response_model=LockerActionResponse)
async def register_from_locker(
    payload: LockerRegistrationRequest,
    session: AsyncSession = session_dependency,
) -> LockerActionResponse:
    return await register_shipment_at_locker(session, payload)


@router.post("/demo/pay", response_model=LockerActionResponse)
async def pay_from_locker(
    payload: LockerShipmentCodeRequest,
    session: AsyncSession = session_dependency,
) -> LockerActionResponse:
    return await pay_shipment_at_locker(session, payload.siuntos_kodas)


@router.post("/demo/send/open", response_model=LockerActionResponse)
async def open_send_doors(
    payload: LockerSendRequest,
    session: AsyncSession = session_dependency,
) -> LockerActionResponse:
    return await open_send_locker(session, payload.siuntos_kodas, payload.skyriaus_id)


@router.post("/demo/send/deliver", response_model=LockerActionResponse)
async def deliver_to_pickup_locker(
    payload: LockerShipmentCodeRequest,
    session: AsyncSession = session_dependency,
) -> LockerActionResponse:
    return await mark_shipment_delivered_to_locker(session, payload.siuntos_kodas)


@router.post("/demo/pickup/open", response_model=LockerActionResponse)
async def open_pickup_doors(
    payload: LockerShipmentCodeRequest,
    session: AsyncSession = session_dependency,
) -> LockerActionResponse:
    return await open_pickup_locker(session, payload.siuntos_kodas)


@router.post("/demo/close", response_model=LockerActionResponse)
async def close_demo_locker_doors(
    session: AsyncSession = session_dependency,
) -> LockerActionResponse:
    return await close_locker_doors(session)
