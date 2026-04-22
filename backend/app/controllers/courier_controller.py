from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.asmuo import DarbuotojoPareigos
from app.schemas.asmuo import (
    DarbuotojasCreate,
    DarbuotojasListItem,
    DarbuotojasRead,
    DarbuotojasUpdate,
)
from app.services import courier_service

router = APIRouter(prefix="/courier", tags=["courier"])


@router.get("", response_model=list[DarbuotojasListItem])
async def list_couriers(
    session: Annotated[AsyncSession, Depends(get_session)],
    role: Annotated[DarbuotojoPareigos | None, Query(alias="role")] = None,
) -> list[DarbuotojasListItem]:
    return await courier_service.list_couriers(session, role=role)


@router.get("/{courier_id}", response_model=DarbuotojasRead)
async def get_courier_details(
    courier_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DarbuotojasRead:
    return await courier_service.get_courier(session, courier_id)


@router.post("", response_model=DarbuotojasRead, status_code=status.HTTP_201_CREATED)
async def create_courier(
    payload: DarbuotojasCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DarbuotojasRead:
    return await courier_service.create_courier(session, payload)


@router.patch("/{courier_id}", response_model=DarbuotojasRead)
async def update_courier(
    courier_id: int,
    payload: DarbuotojasUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DarbuotojasRead:
    return await courier_service.update_courier(session, courier_id, payload)


@router.delete("/{courier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_courier(
    courier_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await courier_service.delete_courier(session, courier_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
