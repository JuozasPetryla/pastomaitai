from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.locker import PastomatoBusena
from app.schemas.locker import (
    PastomatasCreate,
    PastomatasListItem,
    PastomatasRead,
    PastomatasUpdate,
)
from app.services import administration_service

router = APIRouter(prefix="/administration", tags=["administration"])


@router.get("/lockers", response_model=list[PastomatasListItem])
async def list_lockers(
    session: Annotated[AsyncSession, Depends(get_session)],
    region: Annotated[str | None, Query(description="Filter by address text")] = None,
    status_filter: PastomatoBusena | None = Query(default=None, alias="status"),
) -> list[PastomatasListItem]:
    return await administration_service.list_lockers(
        session,
        region=region,
        status_filter=status_filter,
    )


@router.get("/lockers/{locker_id}", response_model=PastomatasRead)
async def get_locker_details(
    locker_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PastomatasRead:
    return await administration_service.get_locker(session, locker_id)


@router.post("/lockers", response_model=PastomatasRead, status_code=status.HTTP_201_CREATED)
async def create_locker(
    payload: PastomatasCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PastomatasRead:
    return await administration_service.create_locker(session, payload)


@router.patch("/lockers/{locker_id}", response_model=PastomatasRead)
async def update_locker(
    locker_id: int,
    payload: PastomatasUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PastomatasRead:
    return await administration_service.update_locker(session, locker_id, payload)


@router.delete("/lockers/{locker_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_locker(
    locker_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await administration_service.delete_locker(session, locker_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
