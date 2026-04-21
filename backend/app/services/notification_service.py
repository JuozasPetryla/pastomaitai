from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pranesimas import Pranesimas, PranesimoTipas
from app.schemas.pranesimas import (
    PranesimasCreate,
    PranesimasListItem,
    PranesimasRead,
    PranesimasUpdate,
)


async def list_pranesimai(
    session: AsyncSession,
    *,
    asmuo_id: int | None = None,
    tipas: PranesimoTipas | None = None,
    issiustas: bool | None = None,
) -> list[PranesimasListItem]:
    statement = select(Pranesimas)

    if asmuo_id is not None:
        statement = statement.where(Pranesimas.asmuo_id == asmuo_id)

    if tipas is not None:
        statement = statement.where(Pranesimas.tipas == tipas)

    if issiustas is not None:
        statement = statement.where(Pranesimas.issiustas == issiustas)

    statement = statement.order_by(Pranesimas.created_at.desc())
    result = await session.scalars(statement)

    return [PranesimasListItem.model_validate(pranesimas) for pranesimas in result.all()]


async def get_pranesimas(session: AsyncSession, pranesimas_id: int) -> PranesimasRead:
    statement = select(Pranesimas).where(Pranesimas.id == pranesimas_id)
    pranesimas = await session.scalar(statement)

    if pranesimas is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pranesimas nerastas",
        )

    return PranesimasRead.model_validate(pranesimas)


async def create_pranesimas(session: AsyncSession, payload: PranesimasCreate) -> PranesimasRead:
    pranesimas = Pranesimas(
        asmuo_id=payload.asmuo_id,
        tekstas=payload.tekstas,
        tipas=payload.tipas,
        issiuntimo_operatoriui_data=payload.issiuntimo_operatoriui_data,
        issiustas=False,
    )

    session.add(pranesimas)
    await session.commit()
    return await get_pranesimas(session, pranesimas.id)


async def update_pranesimas(
    session: AsyncSession,
    pranesimas_id: int,
    payload: PranesimasUpdate,
) -> PranesimasRead:
    pranesimas = await get_pranesimas_model(session, pranesimas_id)

    if payload.tekstas is not None:
        pranesimas.tekstas = payload.tekstas

    if payload.tipas is not None:
        pranesimas.tipas = payload.tipas

    if payload.issiuntimo_operatoriui_data is not None:
        pranesimas.issiuntimo_operatoriui_data = payload.issiuntimo_operatoriui_data

    if payload.operatoriaus_atsako_data is not None:
        pranesimas.operatoriaus_atsako_data = payload.operatoriaus_atsako_data

    if payload.issiustas is not None:
        pranesimas.issiustas = payload.issiustas

    await session.commit()
    return await get_pranesimas(session, pranesimas_id)


async def delete_pranesimas(session: AsyncSession, pranesimas_id: int) -> None:
    pranesimas = await get_pranesimas_model(session, pranesimas_id)
    await session.delete(pranesimas)
    await session.commit()


async def get_pranesimas_model(session: AsyncSession, pranesimas_id: int) -> Pranesimas:
    statement = select(Pranesimas).where(Pranesimas.id == pranesimas_id)
    pranesimas = await session.scalar(statement)

    if pranesimas is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pranesimas nerastas",
        )

    return pranesimas