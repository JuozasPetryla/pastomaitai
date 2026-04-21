from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.pastomatas import Pastomatas, PastomatoBusena, PastomatoSkyrius
from app.schemas.pastomatas import (
    PastomatasCreate,
    PastomatasListItem,
    PastomatasRead,
    PastomatasUpdate,
)


async def list_pastomatai(
    session: AsyncSession,
    *,
    regionas: str | None = None,
    busena: PastomatoBusena | None = None,
) -> list[PastomatasListItem]:
    statement = select(Pastomatas).options(selectinload(Pastomatas.skyriai))

    if regionas:
        statement = statement.where(Pastomatas.adresas.ilike(f"%{regionas}%"))

    if busena:
        statement = statement.where(Pastomatas.busena == busena)
    else:
        statement = statement.where(Pastomatas.busena != PastomatoBusena.panaikintas)

    statement = statement.order_by(Pastomatas.adresas)
    result = await session.scalars(statement)

    return [
        PastomatasListItem(
            id=pastomatas.id,
            adresas=pastomatas.adresas,
            busena=pastomatas.busena,
            produkto_kodas=pastomatas.produkto_kodas,
            skyriu_skaicius=len(pastomatas.skyriai),
        )
        for pastomatas in result.unique().all()
    ]


async def get_pastomatas(session: AsyncSession, pastomatas_id: int) -> PastomatasRead:
    statement = (
        select(Pastomatas)
        .options(selectinload(Pastomatas.skyriai))
        .where(Pastomatas.id == pastomatas_id)
    )
    pastomatas = await session.scalar(statement)

    if pastomatas is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pastomatas nerastas",
        )

    return PastomatasRead.model_validate(pastomatas)


async def create_pastomatas(session: AsyncSession, payload: PastomatasCreate) -> PastomatasRead:
    await ensure_unique_pastomatas(
        session,
        adresas=payload.adresas,
        produkto_kodas=payload.produkto_kodas,
    )

    pastomatas = Pastomatas(
        adresas=payload.adresas,
        busena=PastomatoBusena.neaktyvus,
        produkto_kodas=payload.produkto_kodas,
    )
    numeris = 1
    skyriai: list[PastomatoSkyrius] = []
    for grupe in payload.skyriai:
        for _ in range(grupe.kiekis):
            skyriai.append(PastomatoSkyrius(dydis=grupe.dydis, numeris=numeris))
            numeris += 1
    pastomatas.skyriai = skyriai

    session.add(pastomatas)
    await session.commit()
    return await get_pastomatas(session, pastomatas.id)


async def update_pastomatas(
    session: AsyncSession,
    pastomatas_id: int,
    payload: PastomatasUpdate,
) -> PastomatasRead:
    pastomatas = await get_pastomatas_model(session, pastomatas_id)

    await ensure_unique_pastomatas(
        session,
        adresas=payload.adresas,
        produkto_kodas=payload.produkto_kodas,
        exclude_id=pastomatas_id,
    )

    if payload.adresas is not None:
        pastomatas.adresas = payload.adresas

    if payload.busena is not None:
        pastomatas.busena = payload.busena

    if payload.produkto_kodas is not None:
        pastomatas.produkto_kodas = payload.produkto_kodas

    pastomatas.updated_at = func.now()
    await session.commit()
    return await get_pastomatas(session, pastomatas_id)


async def delete_pastomatas(session: AsyncSession, pastomatas_id: int) -> None:
    pastomatas = await get_pastomatas_model(session, pastomatas_id)

    pastomatas.busena = PastomatoBusena.panaikintas
    pastomatas.updated_at = func.now()
    await session.commit()


async def get_pastomatas_model(session: AsyncSession, pastomatas_id: int) -> Pastomatas:
    statement = (
        select(Pastomatas)
        .options(selectinload(Pastomatas.skyriai))
        .where(Pastomatas.id == pastomatas_id)
    )
    pastomatas = await session.scalar(statement)

    if pastomatas is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pastomatas nerastas",
        )

    return pastomatas


async def ensure_unique_pastomatas(
    session: AsyncSession,
    *,
    adresas: str | None = None,
    produkto_kodas: str | None = None,
    exclude_id: int | None = None,
) -> None:
    if adresas is not None:
        await ensure_unique_field(
            session,
            Pastomatas.adresas == adresas,
            "Paštomatas su tokiu adresu jau egzistuoja",
            exclude_id=exclude_id,
        )

    if produkto_kodas is not None:
        await ensure_unique_field(
            session,
            Pastomatas.produkto_kodas == produkto_kodas,
            "Paštomatas su tokiu produkto kodu jau egzistuoja",
            exclude_id=exclude_id,
        )


async def ensure_unique_field(
    session: AsyncSession,
    condition,
    message: str,
    *,
    exclude_id: int | None,
) -> None:
    statement = select(Pastomatas.id).where(condition)

    if exclude_id is not None:
        statement = statement.where(Pastomatas.id != exclude_id)

    existing_id = await session.scalar(statement.limit(1))

    if existing_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message,
        )
