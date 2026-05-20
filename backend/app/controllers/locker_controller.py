from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.locker import LockerActionResponse, LockerShipmentCodeRequest, LockerStateResponse
from app.services import locker_service

router = APIRouter(prefix="/lockers", tags=["lockers"])


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
