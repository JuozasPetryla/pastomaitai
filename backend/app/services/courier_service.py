from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


from app.models.asmuo import Asmuo, Darbuotojas, DarbuotojoPareigos
from app.schemas.asmuo import (
    DarbuotojasCreate,
    DarbuotojasListItem,
    DarbuotojasRead,
    DarbuotojasUpdate,
)


async def list_darbuotojai(
    session: AsyncSession,
    *,
    pareigos: DarbuotojoPareigos | None = None,
) -> list[DarbuotojasListItem]:
    statement = select(Darbuotojas).options(selectinload(Darbuotojas.asmuo))

    if pareigos is not None:
        statement = statement.where(Darbuotojas.pareigos == pareigos)
    else:
        statement = statement.where(Darbuotojas.pareigos == DarbuotojoPareigos.kurjeris)

    statement = statement.order_by(Asmuo.vardas, Asmuo.pavarde).join(Darbuotojas.asmuo)

    result = await session.scalars(statement)

    return [
        DarbuotojasListItem(
            id=darbuotojas.asmuo_id,
            telefono_nr=darbuotojas.asmuo.telefono_nr,
            el_pastas=darbuotojas.asmuo.el_pastas,
            vardas=darbuotojas.asmuo.vardas,
            pavarde=darbuotojas.asmuo.pavarde,
            pareigos=darbuotojas.pareigos,
        )
        for darbuotojas in result.all()
    ]


async def get_courier(session: AsyncSession, courier_id: int) -> DarbuotojasRead:
    darbuotojas = await get_courier_model(session, courier_id)

    return DarbuotojasRead(
        id=darbuotojas.asmuo_id,
        telefono_nr=darbuotojas.asmuo.telefono_nr,
        el_pastas=darbuotojas.asmuo.el_pastas,
        vardas=darbuotojas.asmuo.vardas,
        pavarde=darbuotojas.asmuo.pavarde,
        pareigos=darbuotojas.pareigos,
        created_at=darbuotojas.asmuo.created_at,
        updated_at=darbuotojas.asmuo.updated_at,
    )


async def create_courier(
    session: AsyncSession,
    payload: DarbuotojasCreate,
) -> DarbuotojasRead:
    await ensure_unique_asmuo(
        session,
        telefono_nr=payload.telefono_nr,
        el_pastas=payload.el_pastas,
    )

    asmuo = Asmuo(
        telefono_nr=payload.telefono_nr,
        el_pastas=payload.el_pastas,
        vardas=payload.vardas,
        pavarde=payload.pavarde,
    )
    session.add(asmuo)
    await session.flush()

    darbuotojas = Darbuotojas(
        asmuo_id=asmuo.id,
        pareigos=payload.pareigos,
    )
    session.add(darbuotojas)

    await session.commit()
    return await get_courier(session, asmuo.id)


async def update_courier(
    session: AsyncSession,
    courier_id: int,
    payload: DarbuotojasUpdate,
) -> DarbuotojasRead:
    darbuotojas = await get_courier_model(session, courier_id)
    asmuo = darbuotojas.asmuo

    await ensure_unique_asmuo(
        session,
        telefono_nr=payload.telefono_nr,
        el_pastas=payload.el_pastas,
        exclude_id=courier_id,
    )

    if payload.telefono_nr is not None:
        asmuo.telefono_nr = payload.telefono_nr

    if payload.el_pastas is not None:
        asmuo.el_pastas = payload.el_pastas

    if payload.vardas is not None:
        asmuo.vardas = payload.vardas

    if payload.pavarde is not None:
        asmuo.pavarde = payload.pavarde

    if payload.pareigos is not None:
        darbuotojas.pareigos = payload.pareigos

    asmuo.updated_at = func.now()
    await session.commit()
    return await get_courier(session, courier_id)


async def delete_courier(session: AsyncSession, courier_id: int) -> None:
    darbuotojas = await get_courier_model(session, courier_id)
    await session.delete(darbuotojas)
    await session.commit()


async def get_courier_model(session: AsyncSession, courier_id: int) -> Darbuotojas:
    statement = (
        select(Darbuotojas)
        .options(selectinload(Darbuotojas.asmuo))
        .where(Darbuotojas.asmuo_id == courier_id)
    )

    darbuotojas = await session.scalar(statement)

    if darbuotojas is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kurjeris nerastas",
        )

    return darbuotojas


async def ensure_unique_asmuo(
    session: AsyncSession,
    *,
    telefono_nr: str | None = None,
    el_pastas: str | None = None,
    exclude_id: int | None = None,
) -> None:
    if telefono_nr is not None:
        await ensure_unique_field(
            session,
            Asmuo.telefono_nr == telefono_nr,
            "Asmuo su tokiu telefono numeriu jau egzistuoja",
            exclude_id=exclude_id,
        )

    if el_pastas is not None:
        await ensure_unique_field(
            session,
            Asmuo.el_pastas == el_pastas,
            "Asmuo su tokiu el. paštu jau egzistuoja",
            exclude_id=exclude_id,
        )


async def ensure_unique_field(
    session: AsyncSession,
    condition,
    message: str,
    *,
    exclude_id: int | None,
) -> None:
    statement = select(Asmuo.id).where(condition)

    if exclude_id is not None:
        statement = statement.where(Asmuo.id != exclude_id)

    existing_id = await session.scalar(statement.limit(1))

    if existing_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=message,
        )