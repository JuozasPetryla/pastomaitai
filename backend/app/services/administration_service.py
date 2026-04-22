from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.locker import Pastomatas, PastomatoBusena, PastomatoSkyrius
from app.schemas.locker import (
    PastomatasCreate,
    PastomatasListItem,
    PastomatasRead,
    PastomatasUpdate,
)


async def list_lockers(
    session: AsyncSession,
    *,
    region: str | None = None,
    status_filter: PastomatoBusena | None = None,
) -> list[PastomatasListItem]:
    statement = select(Pastomatas).options(selectinload(Pastomatas.skyriai))

    if region:
        statement = statement.where(Pastomatas.adresas.ilike(f"%{region}%"))

    if status_filter:
        statement = statement.where(Pastomatas.busena == status_filter)
    else:
        statement = statement.where(Pastomatas.busena != PastomatoBusena.panaikintas)

    statement = statement.order_by(Pastomatas.adresas)
    result = await session.scalars(statement)

    return [
        PastomatasListItem(
            id=locker.id,
            adresas=locker.adresas,
            busena=locker.busena,
            produkto_kodas=locker.produkto_kodas,
            skyriu_skaicius=len(locker.skyriai),
        )
        for locker in result.unique().all()
    ]


async def get_locker(session: AsyncSession, locker_id: int) -> PastomatasRead:
    statement = (
        select(Pastomatas)
        .options(selectinload(Pastomatas.skyriai))
        .where(Pastomatas.id == locker_id)
    )
    locker = await session.scalar(statement)

    if locker is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Locker not found",
        )

    return PastomatasRead.model_validate(locker)


async def create_locker(session: AsyncSession, payload: PastomatasCreate) -> PastomatasRead:
    await ensure_unique_locker(
        session,
        address=payload.adresas,
        product_code=payload.produkto_kodas,
    )

    locker = Pastomatas(
        adresas=payload.adresas,
        busena=PastomatoBusena.neaktyvus,
        produkto_kodas=payload.produkto_kodas,
    )
    locker_number = 1
    compartments: list[PastomatoSkyrius] = []
    for group in payload.skyriai:
        for _ in range(group.kiekis):
            compartments.append(PastomatoSkyrius(dydis=group.dydis, numeris=locker_number))
            locker_number += 1
    locker.skyriai = compartments

    session.add(locker)
    await session.commit()
    return await get_locker(session, locker.id)


async def update_locker(
    session: AsyncSession,
    locker_id: int,
    payload: PastomatasUpdate,
) -> PastomatasRead:
    locker = await get_locker_model(session, locker_id)

    await ensure_unique_locker(
        session,
        address=payload.adresas,
        product_code=payload.produkto_kodas,
        exclude_id=locker_id,
    )

    if payload.adresas is not None:
        locker.adresas = payload.adresas

    if payload.busena is not None:
        locker.busena = payload.busena

    if payload.produkto_kodas is not None:
        locker.produkto_kodas = payload.produkto_kodas

    locker.updated_at = func.now()
    await session.commit()
    return await get_locker(session, locker_id)


async def delete_locker(session: AsyncSession, locker_id: int) -> None:
    locker = await get_locker_model(session, locker_id)

    locker.busena = PastomatoBusena.panaikintas
    locker.updated_at = func.now()
    await session.commit()


async def get_locker_model(session: AsyncSession, locker_id: int) -> Pastomatas:
    statement = (
        select(Pastomatas)
        .options(selectinload(Pastomatas.skyriai))
        .where(Pastomatas.id == locker_id)
    )
    locker = await session.scalar(statement)

    if locker is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Locker not found",
        )

    return locker


async def ensure_unique_locker(
    session: AsyncSession,
    *,
    address: str | None = None,
    product_code: str | None = None,
    exclude_id: int | None = None,
) -> None:
    if address is not None:
        await ensure_unique_field(
            session,
            Pastomatas.adresas == address,
            "Locker with this address already exists",
            exclude_id=exclude_id,
        )

    if product_code is not None:
        await ensure_unique_field(
            session,
            Pastomatas.produkto_kodas == product_code,
            "Locker with this product code already exists",
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
