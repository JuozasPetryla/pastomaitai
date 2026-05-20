from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.locker import (
    CourierLockerContents,
    CourierLockerListItem,
    CourierTakeoutRequest,
    CourierInsertRequest,
    LockerActionResponse,
    LockerShipmentCodeRequest,
    LockerStateResponse,
)
from app.services import locker_service

router = APIRouter(prefix="/lockers", tags=["lockers"])


# ── Demo locker (customer pickup) ────────────────────────────────────────────

@router.get("/demo", response_model=LockerStateResponse)
async def get_demo_locker_state(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LockerStateResponse:
    return await locker_service.get_locker_state(session)


@router.post("/demo/pickup/open", response_model=LockerActionResponse)
async def open_pickup_doors(
    payload: LockerShipmentCodeRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LockerActionResponse:
    return await locker_service.open_pickup_locker(session, payload.siuntos_kodas)


@router.post("/demo/close", response_model=LockerActionResponse)
async def close_demo_locker_doors(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LockerActionResponse:
    return await locker_service.close_locker_doors(session)


@router.post("/{locker_id}/pickup/open", response_model=LockerActionResponse)
async def open_pickup_doors_by_id(
    locker_id: int,
    payload: LockerShipmentCodeRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LockerActionResponse:
    return await locker_service.open_pickup_by_locker_id(session, locker_id, payload.siuntos_kodas)


@router.post("/{locker_id}/close", response_model=LockerActionResponse)
async def close_locker_doors_by_id(
    locker_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LockerActionResponse:
    return await locker_service.close_pickup_by_locker_id(session, locker_id)

# ── Courier service endpoints ─────────────────────────────────────────────────

@router.get("/courier", response_model=list[CourierLockerListItem])
async def list_lockers_for_courier(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[CourierLockerListItem]:
    return await locker_service.list_lockers_for_courier(session)


@router.get("/{locker_id}/contents", response_model=CourierLockerContents)
async def get_locker_contents(
    locker_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CourierLockerContents:
    return await locker_service.get_locker_contents(session, locker_id)


@router.post("/{locker_id}/takeout/open", response_model=LockerActionResponse)
async def courier_open_takeout(
    locker_id: int,
    payload: CourierTakeoutRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LockerActionResponse:
    return await locker_service.courier_open_takeout(session, locker_id, payload.siuntos_kodas)


@router.post("/{locker_id}/takeout/close", response_model=LockerActionResponse)
async def courier_close_takeout(
    locker_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LockerActionResponse:
    return await locker_service.courier_close_takeout(session, locker_id)


@router.post("/{locker_id}/insert/open", response_model=LockerActionResponse)
async def courier_open_insert(
    locker_id: int,
    payload: CourierInsertRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LockerActionResponse:
    return await locker_service.courier_open_insert(session, locker_id, payload.siuntos_kodas)


@router.post("/{locker_id}/insert/close", response_model=LockerActionResponse)
async def courier_close_insert(
    locker_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LockerActionResponse:
    return await locker_service.courier_close_insert(session, locker_id)

@router.post("/{locker_id}/dropoff/open", response_model=LockerActionResponse)
async def open_dropoff_by_id(
    locker_id: int,
    payload: LockerShipmentCodeRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LockerActionResponse:
    return await locker_service.open_dropoff_by_locker_id(session, locker_id, payload.siuntos_kodas)

@router.post("/{locker_id}/dropoff/close", response_model=LockerActionResponse)
async def close_dropoff_by_id(
    locker_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LockerActionResponse:
    return await locker_service.close_dropoff_by_locker_id(session, locker_id)