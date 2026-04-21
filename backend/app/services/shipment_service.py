from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.asmuo import Asmuo, Gavejas, Siuntejas
from app.models.siunta import Siunta, SiuntosBusena
from app.schemas.siunta import (
    ShipmentCreate,
    ShipmentPartyBase,
    ShipmentPartyResponse,
    ShipmentPaymentRequest,
    ShipmentResponse,
    ShipmentUpdate,
)

PRICE_BY_SIZE: dict[str, Decimal] = {
    "s": Decimal("2.49"),
    "m": Decimal("3.99"),
    "l": Decimal("5.99"),
}


def _shipment_load_options() -> tuple:
    return (
        selectinload(Siunta.siuntejas).selectinload(Siuntejas.asmuo),
        selectinload(Siunta.gavejas).selectinload(Gavejas.asmuo),
    )


def _to_party_response(role: Siuntejas | Gavejas) -> ShipmentPartyResponse:
    asmuo = role.asmuo
    return ShipmentPartyResponse(
        asmuo_id=asmuo.id,
        vardas=asmuo.vardas,
        pavarde=asmuo.pavarde,
        telefono_nr=asmuo.telefono_nr,
        el_pastas=asmuo.el_pastas,
    )


def _to_shipment_response(shipment: Siunta) -> ShipmentResponse:
    return ShipmentResponse(
        id=shipment.id,
        uzsakymo_nr=shipment.uzsakymo_nr,
        siuntos_kodas=shipment.siuntos_kodas,
        dydis=shipment.dydis,
        gavimo_adresas=shipment.gavimo_adresas,
        siuntimo_adresas=shipment.siuntimo_adresas,
        data=shipment.data,
        busena=shipment.busena,
        suma=shipment.suma,
        saskaita=shipment.saskaita,
        apmokamas_pastomate=shipment.apmokamas_pastomate,
        pastomato_skyrius_id=shipment.pastomato_skyrius_id,
        created_at=shipment.created_at,
        updated_at=shipment.updated_at,
        siuntejas=_to_party_response(shipment.siuntejas),
        gavejas=_to_party_response(shipment.gavejas),
    )


def shipment_to_response(shipment: Siunta) -> ShipmentResponse:
    return _to_shipment_response(shipment)


def calculate_shipment_price(size: str) -> Decimal:
    return PRICE_BY_SIZE[size]


async def _commit_or_409(session: AsyncSession) -> None:
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nepavyko issaugoti siuntos. Patikrinkite unikalius laukus ir susijusius ID.",
        ) from exc


async def commit_session(session: AsyncSession) -> None:
    await _commit_or_409(session)


async def _get_or_create_party(
    session: AsyncSession,
    payload: ShipmentPartyBase,
    role_model: type[Siuntejas] | type[Gavejas],
) -> Siuntejas | Gavejas:
    query = select(Asmuo).where(
        or_(Asmuo.el_pastas == payload.el_pastas, Asmuo.telefono_nr == payload.telefono_nr)
    ).limit(1)
    asmuo = (await session.execute(query)).scalars().first()

    if asmuo is None:
        asmuo = Asmuo(
            vardas=payload.vardas,
            pavarde=payload.pavarde,
            telefono_nr=payload.telefono_nr,
            el_pastas=payload.el_pastas,
        )
        session.add(asmuo)
        await session.flush()
    else:
        asmuo.vardas = payload.vardas
        asmuo.pavarde = payload.pavarde
        asmuo.telefono_nr = payload.telefono_nr
        asmuo.el_pastas = payload.el_pastas

    role = await session.get(role_model, asmuo.id)
    if role is None:
        role = role_model(asmuo_id=asmuo.id)
        session.add(role)
        await session.flush()

    return role


async def _next_order_number(session: AsyncSession) -> int:
    max_number = await session.scalar(select(func.max(Siunta.uzsakymo_nr)))
    return (max_number or 1000) + 1


async def _get_shipment_model(session: AsyncSession, shipment_id: int) -> Siunta:
    query = (
        select(Siunta)
        .options(*_shipment_load_options())
        .where(Siunta.id == shipment_id)
    )
    shipment = (await session.execute(query)).scalar_one_or_none()

    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Siunta nerasta.")

    return shipment


async def get_shipment_record(session: AsyncSession, shipment_id: int) -> Siunta:
    return await _get_shipment_model(session, shipment_id)


async def get_shipment_by_code_record(session: AsyncSession, shipment_code: str) -> Siunta:
    query = (
        select(Siunta)
        .options(*_shipment_load_options())
        .where(Siunta.siuntos_kodas == shipment_code)
    )
    shipment = (await session.execute(query)).scalar_one_or_none()

    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Siunta nerasta.")

    return shipment


def _ensure_status(
    shipment: Siunta,
    allowed_statuses: set[SiuntosBusena],
    action_name: str,
) -> None:
    if shipment.busena not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Siuntos nepavyko {action_name}. Dabartine busena: {shipment.busena.value}.",
        )


def ensure_shipment_status(
    shipment: Siunta,
    allowed_statuses: set[SiuntosBusena],
    action_name: str,
) -> None:
    _ensure_status(shipment, allowed_statuses, action_name)


async def list_shipments(session: AsyncSession) -> list[ShipmentResponse]:
    query = select(Siunta).options(*_shipment_load_options()).order_by(Siunta.created_at.desc())
    shipments = (await session.execute(query)).scalars().all()
    return [_to_shipment_response(shipment) for shipment in shipments]


async def get_shipment(session: AsyncSession, shipment_id: int) -> ShipmentResponse:
    shipment = await _get_shipment_model(session, shipment_id)
    return _to_shipment_response(shipment)


async def create_shipment(session: AsyncSession, payload: ShipmentCreate) -> ShipmentResponse:
    siuntejas = await _get_or_create_party(session, payload.siuntejas, Siuntejas)
    gavejas = await _get_or_create_party(session, payload.gavejas, Gavejas)
    uzsakymo_nr = await _next_order_number(session)
    siuntos_kodas = f"SNT-{uzsakymo_nr:06d}"

    shipment = Siunta(
        uzsakymo_nr=uzsakymo_nr,
        siuntejas_id=siuntejas.asmuo_id,
        gavejas_id=gavejas.asmuo_id,
        pastomato_skyrius_id=payload.pastomato_skyrius_id,
        dydis=payload.dydis,
        gavimo_adresas=payload.gavimo_adresas,
        siuntimo_adresas=payload.siuntimo_adresas,
        data=payload.data,
        busena=SiuntosBusena.uzregistruota,
        siuntos_kodas=siuntos_kodas,
        suma=calculate_shipment_price(payload.dydis.value),
        saskaita=payload.saskaita or f"MOKEJIMAS-{siuntos_kodas}",
        apmokamas_pastomate=payload.apmokamas_pastomate,
    )
    session.add(shipment)
    await session.flush()
    await _commit_or_409(session)
    return await get_shipment(session, shipment.id)


async def update_shipment(
    session: AsyncSession,
    shipment_id: int,
    payload: ShipmentUpdate,
) -> ShipmentResponse:
    shipment = await _get_shipment_model(session, shipment_id)

    if payload.siuntejas is not None:
        siuntejas = await _get_or_create_party(session, payload.siuntejas, Siuntejas)
        shipment.siuntejas_id = siuntejas.asmuo_id

    if payload.gavejas is not None:
        gavejas = await _get_or_create_party(session, payload.gavejas, Gavejas)
        shipment.gavejas_id = gavejas.asmuo_id

    updates = payload.model_dump(exclude_unset=True, exclude={"siuntejas", "gavejas"})
    for field_name, value in updates.items():
        setattr(shipment, field_name, value)

    if "dydis" in updates:
        shipment.suma = calculate_shipment_price(shipment.dydis.value)

    await _commit_or_409(session)
    return await get_shipment(session, shipment.id)


async def delete_shipment(session: AsyncSession, shipment_id: int) -> None:
    shipment = await _get_shipment_model(session, shipment_id)
    await session.delete(shipment)
    await _commit_or_409(session)


async def pay_shipment(
    session: AsyncSession,
    shipment_id: int,
    payload: ShipmentPaymentRequest,
) -> ShipmentResponse:
    shipment = await _get_shipment_model(session, shipment_id)
    _ensure_status(
        shipment,
        {SiuntosBusena.uzregistruota, SiuntosBusena.parengta},
        "apmoketi",
    )
    shipment.apmokamas_pastomate = payload.budas == "pastomatas"
    shipment.busena = SiuntosBusena.apmoketa
    await _commit_or_409(session)
    return await get_shipment(session, shipment.id)


async def dispatch_shipment(session: AsyncSession, shipment_id: int) -> ShipmentResponse:
    shipment = await _get_shipment_model(session, shipment_id)
    _ensure_status(
        shipment,
        {SiuntosBusena.uzregistruota, SiuntosBusena.apmoketa},
        "issiusti",
    )
    shipment.busena = SiuntosBusena.ideta
    await _commit_or_409(session)
    return await get_shipment(session, shipment.id)


async def deliver_shipment(session: AsyncSession, shipment_id: int) -> ShipmentResponse:
    shipment = await _get_shipment_model(session, shipment_id)
    _ensure_status(shipment, {SiuntosBusena.ideta, SiuntosBusena.tranzite}, "pristatyti")
    shipment.busena = SiuntosBusena.pristatyta
    await _commit_or_409(session)
    return await get_shipment(session, shipment.id)


async def pickup_shipment(session: AsyncSession, shipment_id: int) -> ShipmentResponse:
    shipment = await _get_shipment_model(session, shipment_id)
    _ensure_status(
        shipment,
        {SiuntosBusena.ideta, SiuntosBusena.pristatyta},
        "atsiimti",
    )
    shipment.busena = SiuntosBusena.atsiimta
    await _commit_or_409(session)
    return await get_shipment(session, shipment.id)
