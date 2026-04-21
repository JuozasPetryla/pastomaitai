from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.pranesimas import PranesimoTipas
from app.schemas.pranesimas import (
    PranesimasCreate,
    PranesimasListItem,
    PranesimasRead,
    PranesimasUpdate,
)
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/pranesimai", response_model=list[PranesimasListItem])
async def perziureti_pranesimu_sarasa(
    session: Annotated[AsyncSession, Depends(get_session)],
    asmuo_id: Annotated[int | None, Query(description="Filtravimas pagal asmens ID")] = None,
    tipas: PranesimoTipas | None = None,
    issiustas: bool | None = None,
) -> list[PranesimasListItem]:
    return await notification_service.list_pranesimai(
        session,
        asmuo_id=asmuo_id,
        tipas=tipas,
        issiustas=issiustas,
    )


@router.get("/pranesimai/{pranesimas_id}", response_model=PranesimasRead)
async def pateikti_pasirinkto_pranesimo_informacija(
    pranesimas_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PranesimasRead:
    return await notification_service.get_pranesimas(session, pranesimas_id)


@router.post("/pranesimai", response_model=PranesimasRead, status_code=status.HTTP_201_CREATED)
async def kurti_pranesima(
    payload: PranesimasCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PranesimasRead:
    return await notification_service.create_pranesimas(session, payload)


@router.patch("/pranesimai/{pranesimas_id}", response_model=PranesimasRead)
async def redaguoti_pranesima(
    pranesimas_id: int,
    payload: PranesimasUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PranesimasRead:
    return await notification_service.update_pranesimas(session, pranesimas_id, payload)


@router.delete("/pranesimai/{pranesimas_id}", status_code=status.HTTP_204_NO_CONTENT)
async def naikinti_pranesima(
    pranesimas_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await notification_service.delete_pranesimas(session, pranesimas_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)