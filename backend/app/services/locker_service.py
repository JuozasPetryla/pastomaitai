from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.locker import Pastomatas, PastomatoBusena, PastomatoSkyrius
from app.models.shipment import Siunta, SiuntosBusena, SiuntosDydis
from app.schemas.locker import (
    LockerActionResponse,
    LockerActiveSessionResponse,
    LockerCellResponse,
    LockerStateResponse,
)
from app.services import shipment_service
from app.models.person import Gavejas, Siuntejas

DEMO_LOCKER_CODE = "DEMO-LOCKER-001"
DEMO_LOCKER_ADDRESS = "Vilnius, Demo g. 1"
CELL_LAYOUT: tuple[tuple[int, SiuntosDydis], ...] = (
    (1, SiuntosDydis.s),
    (2, SiuntosDydis.s),
    (3, SiuntosDydis.m),
    (4, SiuntosDydis.m),
    (5, SiuntosDydis.l),
    (6, SiuntosDydis.l),
)


@dataclass
class ActiveLockerSession:
    siuntos_id: int
    siuntos_kodas: str
    skyriaus_id: int
    skyriaus_numeris: int
    dureles_atidarytos: bool
    veiksmas: str = "atsiemimas"


_LOCKER_SESSIONS: dict[str, ActiveLockerSession] = {}


def _get_active_session() -> ActiveLockerSession | None:
    return _LOCKER_SESSIONS.get(DEMO_LOCKER_CODE)


def _set_active_session(active_session: ActiveLockerSession | None) -> None:
    if active_session is None:
        _LOCKER_SESSIONS.pop(DEMO_LOCKER_CODE, None)
        return

    _LOCKER_SESSIONS[DEMO_LOCKER_CODE] = active_session


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

    for number, size in CELL_LAYOUT:
        session.add(
            PastomatoSkyrius(
                pastomatas_id=locker.id,
                numeris=number,
                dydis=size,
            )
        )

    await session.commit()
    return await _load_demo_locker(session)


def _to_state_response(locker: Pastomatas) -> LockerStateResponse:
    active_session = _get_active_session()
    cells: list[LockerCellResponse] = []

    for cell in sorted(locker.skyriai, key=lambda current: current.numeris):
        shipment = cell.siunta
        cells.append(
            LockerCellResponse(
                id=cell.id,
                numeris=cell.numeris,
                dydis=cell.dydis,
                uzimtas=shipment is not None,
                dureles_atidarytos=active_session is not None
                and active_session.skyriaus_id == cell.id,
                siuntos_kodas=shipment.siuntos_kodas if shipment is not None else None,
                siuntos_busena=shipment.busena if shipment is not None else None,
            )
        )

    active_session_response = None
    if active_session is not None:
        active_session_response = LockerActiveSessionResponse(
            veiksmas=active_session.veiksmas,
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


def _find_free_cell(locker: Pastomatas, shipment: Siunta) -> PastomatoSkyrius:
    for cell in sorted(locker.skyriai, key=lambda current: current.numeris):
        if cell.dydis == shipment.dydis and cell.siunta is None:
            return cell

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"Laisvu {shipment.dydis.value.upper()} dydzio skyriu siuo metu nera.",
    )


def _find_shipment_cell(locker: Pastomatas, shipment: Siunta) -> PastomatoSkyrius:
    if shipment.pastomato_skyrius_id is None:
        return _find_free_cell(locker, shipment)

    cell = next(
        (current for current in locker.skyriai if current.id == shipment.pastomato_skyrius_id),
        None,
    )
    if cell is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nerastas skyrius, kuriame turetu buti siunta.",
        )

    return cell


def _build_action_response(
    locker: Pastomatas,
    shipment: Siunta | None,
    message: str,
) -> LockerActionResponse:
    return LockerActionResponse(
        zinute=message,
        locker=_to_state_response(locker),
        siunta=shipment_service.to_shipment_response(shipment) if shipment is not None else None,
    )


async def get_locker_state(session: AsyncSession) -> LockerStateResponse:
    locker = await _load_demo_locker(session)
    return _to_state_response(locker)


async def open_pickup_locker(session: AsyncSession, shipment_code: str) -> LockerActionResponse:
    _ensure_no_open_session()
    locker = await _load_demo_locker(session)
    shipment = await shipment_service.get_shipment_by_code_model(session, shipment_code)

    if shipment.busena != SiuntosBusena.pristatyta:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Atsiimti galima tik pristatyta siunta.",
        )

    cell = _find_shipment_cell(locker, shipment)
    if shipment.pastomato_skyrius_id is None:
        shipment.pastomato_skyrius_id = cell.id
        shipment = await shipment_service.save_shipment(session, shipment)
        locker = await _load_demo_locker(session)
        cell = _find_shipment_cell(locker, shipment)

    _set_active_session(
        ActiveLockerSession(
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
        shipment,
        f"Atidarytas {cell.numeris} skyrius siuntos atsiemimui.",
    )


async def close_locker_doors(session: AsyncSession) -> LockerActionResponse:
    active_session = _get_active_session()
    if active_session is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nera aktyvios pastomato sesijos.",
        )

    shipment = await shipment_service.get_shipment_model(session, active_session.siuntos_id)
    if shipment.busena != SiuntosBusena.pristatyta:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duris po atsiemimo galima uzdaryti tik pristatytai siuntai.",
        )

    shipment.busena = SiuntosBusena.atsiimta
    shipment.pastomato_skyrius_id = None
    shipment = await shipment_service.save_shipment(session, shipment)
    _set_active_session(None)

    locker = await _load_demo_locker(session)
    return _build_action_response(locker, shipment, "Durys uzdarytos, siunta atsiimta.")


# ── Courier service functions ────────────────────────────────────────────────

async def list_lockers_for_courier(session: AsyncSession) -> list:
    """Return all active lockers with pending-takeout and pending-insert counts."""
    from sqlalchemy import func as sql_func
    from app.schemas.locker import CourierLockerListItem
    from app.models.shipment import SiuntosBusena

    query = (
        select(Pastomatas)
        .options(selectinload(Pastomatas.skyriai).selectinload(PastomatoSkyrius.siunta))
        .where(Pastomatas.busena == PastomatoBusena.aktyvus)
        .order_by(Pastomatas.adresas)
    )
    result = await session.execute(query)
    lockers = result.scalars().all()

    items = []
    for locker in lockers:
        laukia_iskrovimo = sum(
            1
            for skyrius in locker.skyriai
            if skyrius.siunta is not None and skyrius.siunta.busena == SiuntosBusena.ideta
        )
        laukia_pakrovimo = sum(
            1
            for skyrius in locker.skyriai
            if skyrius.siunta is not None
            and skyrius.siunta.busena == SiuntosBusena.uzregistruota
        )
        items.append(
            CourierLockerListItem(
                id=locker.id,
                produkto_kodas=locker.produkto_kodas,
                adresas=locker.adresas,
                busena=locker.busena,
                laukia_iskrovimo=laukia_iskrovimo,
                laukia_pakrovimo=laukia_pakrovimo,
            )
        )

    return items


async def _load_locker_by_id(session: AsyncSession, locker_id: int) -> Pastomatas:
    from app.services.shipment_service import _shipment_load_options
    query = (
        select(Pastomatas)
        .options(
            selectinload(Pastomatas.skyriai)
            .selectinload(PastomatoSkyrius.siunta)
            .selectinload(Siunta.siuntejas)
            .selectinload(Siuntejas.asmuo),
            selectinload(Pastomatas.skyriai)
            .selectinload(PastomatoSkyrius.siunta)
            .selectinload(Siunta.gavejas)
            .selectinload(Gavejas.asmuo),
        )
        .where(Pastomatas.id == locker_id)
    )
    locker = (await session.execute(query)).scalar_one_or_none()
    if locker is None:
        raise HTTPException(status_code=404, detail="Pastomatas nerastas.")
    return locker


async def get_locker_contents(session: AsyncSession, locker_id: int):
    """Return full locker state plus categorised shipment lists for courier."""
    from app.schemas.locker import CourierLockerContents
    from app.models.shipment import SiuntosBusena
    from app.services import shipment_service

    locker = await _load_locker_by_id(session, locker_id)

    siuntos_iskrovimui = []
    siuntos_pakrovimui = []

    for skyrius in locker.skyriai:
        if skyrius.siunta is None:
            continue
        siunta = skyrius.siunta
        if siunta.busena == SiuntosBusena.ideta:
            siuntos_iskrovimui.append(shipment_service.to_shipment_response(siunta))
        elif siunta.busena == SiuntosBusena.uzregistruota:
            siuntos_pakrovimui.append(shipment_service.to_shipment_response(siunta))

    locker_state = _to_state_response_for_locker(locker)

    return CourierLockerContents(
        locker=locker_state,
        siuntos_iskrovimui=siuntos_iskrovimui,
        siuntos_pakrovimui=siuntos_pakrovimui,
    )


def _to_state_response_for_locker(locker: Pastomatas) -> LockerStateResponse:
    """Like _to_state_response but uses the given locker's code for session lookup."""
    active_session = _LOCKER_SESSIONS.get(locker.produkto_kodas)
    cells: list[LockerCellResponse] = []

    for cell in sorted(locker.skyriai, key=lambda c: c.numeris):
        shipment = cell.siunta
        cells.append(
            LockerCellResponse(
                id=cell.id,
                numeris=cell.numeris,
                dydis=cell.dydis,
                uzimtas=shipment is not None,
                dureles_atidarytos=active_session is not None
                and active_session.skyriaus_id == cell.id,
                siuntos_kodas=shipment.siuntos_kodas if shipment is not None else None,
                siuntos_busena=shipment.busena if shipment is not None else None,
            )
        )

    active_session_response = None
    if active_session is not None:
        active_session_response = LockerActiveSessionResponse(
            veiksmas=active_session.veiksmas,
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


def _get_session_for_locker(locker_code: str) -> ActiveLockerSession | None:
    return _LOCKER_SESSIONS.get(locker_code)


def _set_session_for_locker(locker_code: str, session: ActiveLockerSession | None) -> None:
    if session is None:
        _LOCKER_SESSIONS.pop(locker_code, None)
    else:
        _LOCKER_SESSIONS[session.veiksmas + locker_code] if False else None  # no-op
        _LOCKER_SESSIONS[locker_code] = session


def _ensure_no_open_session_for(locker_code: str) -> None:
    if _get_session_for_locker(locker_code) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pirmiausia uzdarykite jau atidarytas dureles.",
        )


async def courier_open_takeout(
    session: AsyncSession, locker_id: int, shipment_code: str
) -> LockerActionResponse:
    """Courier opens a cell to take out a shipment (ideta → opens door)."""
    from app.models.shipment import SiuntosBusena

    locker = await _load_locker_by_id(session, locker_id)
    _ensure_no_open_session_for(locker.produkto_kodas)

    siunta = await shipment_service.get_shipment_by_code_model(session, shipment_code)

    if siunta.busena != SiuntosBusena.ideta:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Iškrauti galima tik įdėtą siuntą (busena: ideta).",
        )

    cell = _find_shipment_cell(locker, siunta)

    _set_session_for_locker(
        locker.produkto_kodas,
        ActiveLockerSession(
            siuntos_id=siunta.id,
            siuntos_kodas=siunta.siuntos_kodas,
            skyriaus_id=cell.id,
            skyriaus_numeris=cell.numeris,
            dureles_atidarytos=True,
            veiksmas="iskrovimas",
        ),
    )

    locker = await _load_locker_by_id(session, locker_id)
    return _build_action_response_for(
        locker,
        siunta,
        f"Atidarytas {cell.numeris} skyrius siuntos išėmimui.",
    )


async def courier_close_takeout(
    session: AsyncSession, locker_id: int
) -> LockerActionResponse:
    """Courier closes the door after taking out the shipment → tranzite."""
    from app.models.shipment import SiuntosBusena

    locker = await _load_locker_by_id(session, locker_id)
    active = _get_session_for_locker(locker.produkto_kodas)

    if active is None or active.veiksmas != "iskrovimas":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nėra aktyvios iškrovimo sesijos šiam paštomatui.",
        )

    siunta = await shipment_service.get_shipment_model(session, active.siuntos_id)

    if siunta.busena != SiuntosBusena.ideta:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Siunta jau nebe įdėta būsenoje.",
        )

    siunta.busena = SiuntosBusena.tranzite
    siunta.pastomato_skyrius_id = None
    siunta = await shipment_service.save_shipment(session, siunta)
    _set_session_for_locker(locker.produkto_kodas, None)

    locker = await _load_locker_by_id(session, locker_id)
    return _build_action_response_for(
        locker,
        siunta,
        "Durys uždarytos, siunta paimta. Busena: tranzite.",
    )


async def courier_open_insert(
    session: AsyncSession, locker_id: int, shipment_code: str
) -> LockerActionResponse:
    """Courier opens a cell to insert a shipment (uzregistruota → assigns cell, opens door)."""
    from app.models.shipment import SiuntosBusena

    locker = await _load_locker_by_id(session, locker_id)
    _ensure_no_open_session_for(locker.produkto_kodas)

    siunta = await shipment_service.get_shipment_by_code_model(session, shipment_code)

    if siunta.busena not in (SiuntosBusena.uzregistruota, SiuntosBusena.tranzite):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pakrauti galima tik užregistruotą arba tranzite esančią siuntą.",
        )
    
    if siunta.gavimo_adresas != locker.adresas:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Siunta turi būti pristatyta į '{siunta.gavimo_adresas}', ne į '{locker.adresas}'.",
        )

    # Try to assign a free cell of matching size
    try:
        cell = _find_free_cell(locker, siunta)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Nėra laisvų {siunta.dydis.value.upper()} dydžio skyrių. "
                "Nukreipkite siuntą į kitą paštomatą."
            ),
        )

    siunta.pastomato_skyrius_id = cell.id
    siunta = await shipment_service.save_shipment(session, siunta)

    _set_session_for_locker(
        locker.produkto_kodas,
        ActiveLockerSession(
            siuntos_id=siunta.id,
            siuntos_kodas=siunta.siuntos_kodas,
            skyriaus_id=cell.id,
            skyriaus_numeris=cell.numeris,
            dureles_atidarytos=True,
            veiksmas="pakrovimas",
        ),
    )

    locker = await _load_locker_by_id(session, locker_id)
    return _build_action_response_for(
        locker,
        siunta,
        f"Atidarytas {cell.numeris} skyrius siuntos įdėjimui.",
    )


async def courier_close_insert(
    session: AsyncSession, locker_id: int
) -> LockerActionResponse:
    """Courier closes the door after inserting the shipment → pristatyta."""
    from app.models.shipment import SiuntosBusena
    from app.services import notification_service

    locker = await _load_locker_by_id(session, locker_id)
    active = _get_session_for_locker(locker.produkto_kodas)

    if active is None or active.veiksmas != "pakrovimas":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nėra aktyvios pakrovimo sesijos šiam paštomatui.",
        )

    siunta = await shipment_service.get_shipment_model(session, active.siuntos_id)

    siunta.busena = SiuntosBusena.pristatyta
    siunta = await shipment_service.save_shipment(session, siunta)

    # Send delivery notification to receiver
    await notification_service.create_messages(session, siunta.id, SiuntosBusena.pristatyta)

    _set_session_for_locker(locker.produkto_kodas, None)

    locker = await _load_locker_by_id(session, locker_id)
    return _build_action_response_for(
        locker,
        siunta,
        "Durys uždarytos, siunta pristatyta. Gavėjas informuotas.",
    )


def _build_action_response_for(
    locker: Pastomatas,
    shipment: Siunta | None,
    message: str,
) -> LockerActionResponse:
    return LockerActionResponse(
        zinute=message,
        locker=_to_state_response_for_locker(locker),
        siunta=shipment_service.to_shipment_response(shipment) if shipment is not None else None,
    )

async def open_pickup_by_locker_id(
    session: AsyncSession, locker_id: int, shipment_code: str
) -> LockerActionResponse:
    locker = await _load_locker_by_id(session, locker_id)
    _ensure_no_open_session_for(locker.produkto_kodas)
    siunta = await shipment_service.get_shipment_by_code_model(session, shipment_code)

    if siunta.busena != SiuntosBusena.pristatyta:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Atsiimti galima tik pristatyta siunta.",
        )

    cell = _find_shipment_cell(locker, siunta)
    _set_session_for_locker(
        locker.produkto_kodas,
        ActiveLockerSession(
            siuntos_id=siunta.id,
            siuntos_kodas=siunta.siuntos_kodas,
            skyriaus_id=cell.id,
            skyriaus_numeris=cell.numeris,
            dureles_atidarytos=True,
            veiksmas="atsiemimas",
        ),
    )
    locker = await _load_locker_by_id(session, locker_id)
    return _build_action_response_for(locker, siunta, f"Atidarytas {cell.numeris} skyrius siuntos atsiemimui.")

async def close_pickup_by_locker_id(
    session: AsyncSession, locker_id: int
) -> LockerActionResponse:
    locker = await _load_locker_by_id(session, locker_id)
    active = _get_session_for_locker(locker.produkto_kodas)

    if active is None or active.veiksmas != "atsiemimas":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nėra aktyvios atsiėmimo sesijos šiam paštomatui.",
        )

    siunta = await shipment_service.get_shipment_model(session, active.siuntos_id)

    if siunta.busena != SiuntosBusena.pristatyta:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Siunta jau nebe pristatyta būsenoje.",
        )

    siunta.busena = SiuntosBusena.atsiimta
    siunta.pastomato_skyrius_id = None
    siunta = await shipment_service.save_shipment(session, siunta)
    _set_session_for_locker(locker.produkto_kodas, None)

    session.expire_all()
    locker = await _load_locker_by_id(session, locker_id)
    await session.refresh(siunta)
    return _build_action_response_for(locker, siunta, "Durys uždarytos, siunta atsiimta.")

async def open_dropoff_by_locker_id(
    session: AsyncSession, locker_id: int, shipment_code: str
) -> LockerActionResponse:
    locker = await _load_locker_by_id(session, locker_id)
    _ensure_no_open_session_for(locker.produkto_kodas)
    siunta = await shipment_service.get_shipment_by_code_model(session, shipment_code)

    if siunta.busena != SiuntosBusena.uzregistruota:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Įdėti galima tik užregistruotą siuntą.",
        )
    
    if siunta.siuntimo_adresas != locker.adresas:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Siunta turi būti įdėta iš '{siunta.siuntimo_adresas}', ne iš '{locker.adresas}'.",
        )

    cell = _find_free_cell(locker, siunta)
    siunta.pastomato_skyrius_id = cell.id
    siunta = await shipment_service.save_shipment(session, siunta)

    _set_session_for_locker(
        locker.produkto_kodas,
        ActiveLockerSession(
            siuntos_id=siunta.id,
            siuntos_kodas=siunta.siuntos_kodas,
            skyriaus_id=cell.id,
            skyriaus_numeris=cell.numeris,
            dureles_atidarytos=True,
            veiksmas="idejimas",
        ),
    )
    session.expire_all()
    locker = await _load_locker_by_id(session, locker_id)
    await session.refresh(siunta)
    return _build_action_response_for(locker, siunta, f"Atidarytas {cell.numeris} skyrius siuntos įdėjimui.")

async def close_dropoff_by_locker_id(
    session: AsyncSession, locker_id: int
) -> LockerActionResponse:
    locker = await _load_locker_by_id(session, locker_id)
    active = _get_session_for_locker(locker.produkto_kodas)

    if active is None or active.veiksmas != "idejimas":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nėra aktyvios įdėjimo sesijos šiam paštomatui.",
        )

    siunta = await shipment_service.get_shipment_model(session, active.siuntos_id)
    siunta.busena = SiuntosBusena.ideta
    siunta = await shipment_service.save_shipment(session, siunta)
    _set_session_for_locker(locker.produkto_kodas, None)

    session.expire_all()
    locker = await _load_locker_by_id(session, locker_id)
    await session.refresh(siunta)
    return _build_action_response_for(locker, siunta, "Durys uždarytos, siunta įdėta. Laukiama kurjerio.")