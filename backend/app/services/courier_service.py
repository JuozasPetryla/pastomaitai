from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.person import Asmuo, Darbuotojas, DarbuotojoPareigos
from app.schemas.person import (
    DarbuotojasCreate,
    DarbuotojasListItem,
    DarbuotojasRead,
    DarbuotojasUpdate,
)


async def list_couriers(
    session: AsyncSession,
    *,
    role: DarbuotojoPareigos | None = None,
) -> list[DarbuotojasListItem]:
    statement = select(Darbuotojas).options(selectinload(Darbuotojas.asmuo))

    if role is not None:
        statement = statement.where(Darbuotojas.pareigos == role)
    else:
        statement = statement.where(Darbuotojas.pareigos == DarbuotojoPareigos.kurjeris)

    statement = statement.order_by(Asmuo.vardas, Asmuo.pavarde).join(Darbuotojas.asmuo)
    result = await session.scalars(statement)

    return [
        DarbuotojasListItem(
            id=employee.asmuo_id,
            telefono_nr=employee.asmuo.telefono_nr,
            el_pastas=employee.asmuo.el_pastas,
            vardas=employee.asmuo.vardas,
            pavarde=employee.asmuo.pavarde,
            pareigos=employee.pareigos,
        )
        for employee in result.all()
    ]


async def get_courier(session: AsyncSession, courier_id: int) -> DarbuotojasRead:
    employee = await get_courier_model(session, courier_id)

    return DarbuotojasRead(
        id=employee.asmuo_id,
        telefono_nr=employee.asmuo.telefono_nr,
        el_pastas=employee.asmuo.el_pastas,
        vardas=employee.asmuo.vardas,
        pavarde=employee.asmuo.pavarde,
        pareigos=employee.pareigos,
        created_at=employee.asmuo.created_at,
        updated_at=employee.asmuo.updated_at,
    )


async def create_courier(
    session: AsyncSession,
    payload: DarbuotojasCreate,
) -> DarbuotojasRead:
    await ensure_unique_person(
        session,
        telefono_nr=payload.telefono_nr,
        el_pastas=payload.el_pastas,
    )

    person = Asmuo(
        telefono_nr=payload.telefono_nr,
        el_pastas=payload.el_pastas,
        vardas=payload.vardas,
        pavarde=payload.pavarde,
    )
    session.add(person)
    await session.flush()

    employee = Darbuotojas(
        asmuo_id=person.id,
        pareigos=payload.pareigos,
    )
    session.add(employee)

    await session.commit()
    return await get_courier(session, person.id)


async def update_courier(
    session: AsyncSession,
    courier_id: int,
    payload: DarbuotojasUpdate,
) -> DarbuotojasRead:
    employee = await get_courier_model(session, courier_id)
    person = employee.asmuo

    await ensure_unique_person(
        session,
        telefono_nr=payload.telefono_nr,
        el_pastas=payload.el_pastas,
        exclude_id=courier_id,
    )

    if payload.telefono_nr is not None:
        person.telefono_nr = payload.telefono_nr

    if payload.el_pastas is not None:
        person.el_pastas = payload.el_pastas

    if payload.vardas is not None:
        person.vardas = payload.vardas

    if payload.pavarde is not None:
        person.pavarde = payload.pavarde

    if payload.pareigos is not None:
        employee.pareigos = payload.pareigos

    person.updated_at = func.now()
    await session.commit()
    return await get_courier(session, courier_id)


async def delete_courier(session: AsyncSession, courier_id: int) -> None:
    employee = await get_courier_model(session, courier_id)
    await session.delete(employee)
    await session.commit()


async def get_courier_model(session: AsyncSession, courier_id: int) -> Darbuotojas:
    statement = (
        select(Darbuotojas)
        .options(selectinload(Darbuotojas.asmuo))
        .where(Darbuotojas.asmuo_id == courier_id)
    )

    employee = await session.scalar(statement)

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courier not found",
        )

    return employee


async def ensure_unique_person(
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
            "A person with this phone number already exists",
            exclude_id=exclude_id,
        )

    if el_pastas is not None:
        await ensure_unique_field(
            session,
            Asmuo.el_pastas == el_pastas,
            "A person with this email already exists",
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
