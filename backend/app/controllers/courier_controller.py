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
async def perziureti_kurjeriu_sarasa(
    session: Annotated[AsyncSession, Depends(get_session)],
    pareigos: Annotated[DarbuotojoPareigos | None, Query()] = None,
) -> list[DarbuotojasListItem]:
    return await courier_service.list_couriers(session, pareigos=pareigos)


@router.get("/{courier_id}", response_model=DarbuotojasRead)
async def pateikti_kurjerio_informacija(
    courier_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DarbuotojasRead:
    return await courier_service.get_courier(session, courier_id)


@router.post("", response_model=DarbuotojasRead, status_code=status.HTTP_201_CREATED)
async def kurti_kurjeri(
    payload: DarbuotojasCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DarbuotojasRead:
    return await courier_service.create_courier(session, payload)


@router.patch("/{courier_id}", response_model=DarbuotojasRead)
async def redaguoti_kurjeri(
    courier_id: int,
    payload: DarbuotojasUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DarbuotojasRead:
    return await courier_service.update_courier(session, courier_id, payload)


@router.delete("/{courier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def naikinti_kurjeri(
    courier_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await courier_service.delete_courier(session, courier_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)