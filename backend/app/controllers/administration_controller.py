from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.pastomatas import PastomatoBusena
from app.schemas.pastomatas import (
    PastomatasCreate,
    PastomatasListItem,
    PastomatasRead,
    PastomatasUpdate,
)
from app.services import administration_service

router = APIRouter(prefix="/administration", tags=["administration"])


@router.get("/pastomatai", response_model=list[PastomatasListItem])
async def perziureti_pastomatu_sarasa(
    session: Annotated[AsyncSession, Depends(get_session)],
    regionas: Annotated[str | None, Query(description="Filtravimas pagal adreso tekstą")] = None,
    busena: PastomatoBusena | None = None,
) -> list[PastomatasListItem]:
    return await administration_service.list_pastomatai(
        session,
        regionas=regionas,
        busena=busena,
    )


@router.get("/pastomatai/{pastomatas_id}", response_model=PastomatasRead)
async def pateikti_pasirinkto_pastomato_informacija(
    pastomatas_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PastomatasRead:
    return await administration_service.get_pastomatas(session, pastomatas_id)


@router.post("/pastomatai", response_model=PastomatasRead, status_code=status.HTTP_201_CREATED)
async def kurti_pastomata(
    payload: PastomatasCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PastomatasRead:
    return await administration_service.create_pastomatas(session, payload)


@router.patch("/pastomatai/{pastomatas_id}", response_model=PastomatasRead)
async def redaguoti_pastomata(
    pastomatas_id: int,
    payload: PastomatasUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PastomatasRead:
    return await administration_service.update_pastomatas(session, pastomatas_id, payload)


@router.delete("/pastomatai/{pastomatas_id}", status_code=status.HTTP_204_NO_CONTENT)
async def naikinti_pastomata(
    pastomatas_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await administration_service.delete_pastomatas(session, pastomatas_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
