from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.pastomatas import Pastomatas, PastomatoBusena, PastomatoSkyrius
from app.models.siunta import SiuntosBusena, SiuntosDydis
from app.schemas.pastomatas import (
    LockerActionResponse,
    LockerActiveSessionResponse,
    LockerCellResponse,
    LockerRegistrationRequest,
    LockerStateResponse,
)
from app.schemas.siunta import ShipmentCreate
from app.services.shipment_service import (
    commit_session,
    create_shipment,
    ensure_shipment_status,
    get_shipment,
    get_shipment_by_code_record,
    get_shipment_record,
)

DEMO_LOCKER_CODE = "DEMO-LOCKER-001"
DEMO_LOCKER_ADDRESS = "Vilnius, Demo g. 1"
CELL_LAYOUT: tuple[tuple[int, SiuntosDydis], ...] = (
    (1, SiuntosDydis.s),
    (2, SiuntosDydis.s),
    (3, SiuntosDydis.s),
    (4, SiuntosDydis.m),
    (5, SiuntosDydis.m),
    (6, SiuntosDydis.m),
    (7, SiuntosDydis.l),
    (8, SiuntosDydis.l),
    (9, SiuntosDydis.l),
)


@dataclass
class ActiveLockerSession:
    veiksmas: str
    siuntos_id: int
    siuntos_kodas: str
    skyriaus_id: int
    skyriaus_numeris: int
    dureles_atidarytos: bool


_LOCKER_SESSIONS: dict[str, ActiveLockerSession] = {}


async def _load_demo_locker(session: AsyncSession) -> Pastomatas:
    query = (
        select(Pastomatas)
        .options(selectinload(Pastomatas.skyriai).selectinload(PastomatoSkyrius.siunta))
        .where(Pastomatas.produkto_kodas == DEMO_LOCKER_CODE)
    )
    locker = (await session.execute(query)).scalar_one_or_none()

    if locker is not None:
        return locker

    locker = Pastomatas(
        adresas=DEMO_LOCKER_ADDRESS,
        busena=PastomatoBusena.aktyvus,
        produkto_kodas=DEMO_LOCKER_CODE,
    )
    session.add(locker)
    await session.flush()

    for numeris, dydis in CELL_LAYOUT:
        session.add(
            PastomatoSkyrius(
                pastomatas_id=locker.id,
                numeris=numeris,
                dydis=dydis,
            )
        )

    await commit_session(session)
    return await _load_demo_locker(session)


def _get_active_session() -> ActiveLockerSession | None:
    return _LOCKER_SESSIONS.get(DEMO_LOCKER_CODE)


def _set_active_session(active_session: ActiveLockerSession | None) -> None:
    if active_session is None:
        _LOCKER_SESSIONS.pop(DEMO_LOCKER_CODE, None)
        return

    _LOCKER_SESSIONS[DEMO_LOCKER_CODE] = active_session


def _to_state_response(locker: Pastomatas) -> LockerStateResponse:
    active_session = _get_active_session()
    cells = []

    for cell in sorted(locker.skyriai, key=lambda current: current.numeris):
        shipment = cell.siunta
        is_open = active_session is not None and active_session.skyriaus_id == cell.id
        cells.append(
            LockerCellResponse(
                id=cell.id,
                numeris=cell.numeris,
                dydis=cell.dydis,
                uzimtas=shipment is not None,
                dureles_atidarytos=is_open,
                siuntos_kodas=shipment.siuntos_kodas if shipment is not None else None,
                siuntos_busena=shipment.busena if shipment is not None else None,
            )
        )

    active_session_response = None
    if active_session is not None:
        active_session_response = LockerActiveSessionResponse(
            veiksmas=active_session.veiksmas,  # type: ignore[arg-type]
            siuntos_id=active_session.siuntos_id,
            siuntos_kodas=active_session.siuntos_kodas,
            skyriaus_id=active_session.skyriaus_id,
            skyriaus_numeris=active_session.skyriaus_numeris,
            dureles_atidarytos=active_session.dureles_atidarytos,
        )

    return LockerStateResponse(
        id=locker.id,
        produkto_kodas=locker.produkto_kodas,
        adresas=locker.adresas,
        busena=locker.busena,
        created_at=locker.created_at,
        updated_at=locker.updated_at,
        skyriai=cells,
        aktyvi_sesija=active_session_response,
    )


def _ensure_no_open_session() -> None:
    if _get_active_session() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pirmiausia uzdarykite jau atidarytas pastomato dureles.",
        )


def _find_free_cell(locker: Pastomatas, size: SiuntosDydis) -> PastomatoSkyrius:
    for cell in sorted(locker.skyriai, key=lambda current: current.numeris):
        if cell.dydis == size and cell.siunta is None:
            return cell

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"Laisvu {size.value.upper()} dydzio skyriu siuo metu nera.",
    )


def _build_action_response(
    locker: Pastomatas,
    shipment_response,
    message: str,
) -> LockerActionResponse:
    return LockerActionResponse(
        zinute=message,
        locker=_to_state_response(locker),
        siunta=shipment_response,
    )


async def get_locker_state(session: AsyncSession) -> LockerStateResponse:
    locker = await _load_demo_locker(session)
    return _to_state_response(locker)


async def register_shipment_at_locker(
    session: AsyncSession,
    payload: LockerRegistrationRequest,
) -> LockerActionResponse:
    shipment = await create_shipment(
        session,
        ShipmentCreate(
            siuntejas=payload.siuntejas,
            gavejas=payload.gavejas,
            dydis=payload.dydis,
            gavimo_adresas=payload.gavimo_adresas,
            siuntimo_adresas=payload.siuntimo_adresas,
            data=payload.data,
            saskaita=payload.saskaita,
            apmokamas_pastomate=True,
            pastomato_skyrius_id=None,
        ),
    )
    locker = await _load_demo_locker(session)
    return _build_action_response(
        locker,
        shipment,
        f"Siunta uzregistruota pastomate. Moketina suma: {shipment.suma:.2f} EUR.",
    )


async def pay_shipment_at_locker(
    session: AsyncSession,
    shipment_code: str,
) -> LockerActionResponse:
    shipment = await get_shipment_by_code_record(session, shipment_code)
    ensure_shipment_status(
        shipment,
        {SiuntosBusena.uzregistruota, SiuntosBusena.parengta},
        "apmoketi pastomate",
    )
    shipment.apmokamas_pastomate = True
    shipment.busena = SiuntosBusena.apmoketa
    await commit_session(session)
    locker = await _load_demo_locker(session)
    return _build_action_response(
        locker,
        await get_shipment(session, shipment.id),
        f"Mokejimas pastomate patvirtintas. Suma: {shipment.suma:.2f} EUR.",
    )


async def open_send_locker(
    session: AsyncSession,
    shipment_code: str,
) -> LockerActionResponse:
    _ensure_no_open_session()
    locker = await _load_demo_locker(session)
    shipment = await get_shipment_by_code_record(session, shipment_code)
    ensure_shipment_status(shipment, {SiuntosBusena.apmoketa}, "atidaryti siuntimui")

    free_cell = _find_free_cell(locker, shipment.dydis)
    shipment.pastomato_skyrius_id = free_cell.id
    await commit_session(session)

    _set_active_session(
        ActiveLockerSession(
            veiksmas="idejimas",
            siuntos_id=shipment.id,
            siuntos_kodas=shipment.siuntos_kodas,
            skyriaus_id=free_cell.id,
            skyriaus_numeris=free_cell.numeris,
            dureles_atidarytos=True,
        )
    )
    locker = await _load_demo_locker(session)
    return _build_action_response(
        locker,
        await get_shipment(session, shipment.id),
        f"Atidarytas {free_cell.numeris} skyrius siuntos idejimui.",
    )


async def close_locker_doors(session: AsyncSession) -> LockerActionResponse:
    active_session = _get_active_session()
    if active_session is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nera aktyvios pastomato sesijos.",
        )

    shipment = await get_shipment_record(session, active_session.siuntos_id)
    if active_session.veiksmas == "idejimas":
        ensure_shipment_status(shipment, {SiuntosBusena.apmoketa}, "uzdaryti po idejimo")
        shipment.busena = SiuntosBusena.ideta
        message = "Durys uzdarytos, siunta ideta i pastomata."
    else:
        ensure_shipment_status(shipment, {SiuntosBusena.pristatyta}, "uzdaryti po atsiemimo")
        shipment.busena = SiuntosBusena.atsiimta
        shipment.pastomato_skyrius_id = None
        message = "Durys uzdarytos, siunta atsiimta."

    await commit_session(session)
    _set_active_session(None)
    locker = await _load_demo_locker(session)
    return _build_action_response(locker, await get_shipment(session, shipment.id), message)


async def mark_shipment_delivered_to_locker(
    session: AsyncSession,
    shipment_code: str,
) -> LockerActionResponse:
    locker = await _load_demo_locker(session)
    shipment = await get_shipment_by_code_record(session, shipment_code)
    ensure_shipment_status(
        shipment,
        {SiuntosBusena.ideta, SiuntosBusena.tranzite},
        "pristatyti i atsiemimo pastomata",
    )

    if shipment.pastomato_skyrius_id is None:
        shipment.pastomato_skyrius_id = _find_free_cell(locker, shipment.dydis).id

    shipment.busena = SiuntosBusena.pristatyta
    await commit_session(session)
    locker = await _load_demo_locker(session)
    return _build_action_response(
        locker,
        await get_shipment(session, shipment.id),
        "Siunta pazymeta kaip pristatyta i atsiemimo pastomata.",
    )


async def open_pickup_locker(session: AsyncSession, shipment_code: str) -> LockerActionResponse:
    _ensure_no_open_session()
    locker = await _load_demo_locker(session)
    shipment = await get_shipment_by_code_record(session, shipment_code)
    ensure_shipment_status(shipment, {SiuntosBusena.pristatyta}, "atidaryti atsiemimui")

    if shipment.pastomato_skyrius_id is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Siunta dar nepriskirta nei vienam pastomato skyriui.",
        )

    cell = next(
        (current for current in locker.skyriai if current.id == shipment.pastomato_skyrius_id),
        None,
    )
    if cell is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nerastas skyrius, kuriame turetu buti siunta.",
        )

    _set_active_session(
        ActiveLockerSession(
            veiksmas="atsiemimas",
            siuntos_id=shipment.id,
            siuntos_kodas=shipment.siuntos_kodas,
            skyriaus_id=cell.id,
            skyriaus_numeris=cell.numeris,
            dureles_atidarytos=True,
        )
    )
    locker = await _load_demo_locker(session)
    return _build_action_response(
        locker,
        await get_shipment(session, shipment.id),
        f"Atidarytas {cell.numeris} skyrius siuntos atsiemimui.",
    )
