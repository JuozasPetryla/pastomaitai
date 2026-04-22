from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.siunta import SiuntosBusena
from app.schemas.siunta import ShipmentCreate, ShipmentListItem, ShipmentResponse, ShipmentUpdate
from app.services import shipment_service

router = APIRouter(prefix="/shipments", tags=["shipments"])


@router.get("", response_model=list[ShipmentListItem])
async def perziureti_siuntu_sarasa(
    session: Annotated[AsyncSession, Depends(get_session)],
    siuntos_kodas: Annotated[str | None, Query(description="Filtravimas pagal siuntos koda")] = None,
    busena: SiuntosBusena | None = None,
) -> list[ShipmentListItem]:
    return await shipment_service.list_shipments(
        session,
        siuntos_kodas=siuntos_kodas,
        busena=busena,
    )


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def pateikti_pasirinktos_siuntos_informacija(
    shipment_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ShipmentResponse:
    return await shipment_service.get_shipment(session, shipment_id)


@router.post("", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
async def kurti_siunta(
    payload: ShipmentCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ShipmentResponse:
    return await shipment_service.create_shipment(session, payload)


@router.patch("/{shipment_id}", response_model=ShipmentResponse)
async def redaguoti_siunta(
    shipment_id: int,
    payload: ShipmentUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ShipmentResponse:
    return await shipment_service.update_shipment(session, shipment_id, payload)


@router.delete("/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def naikinti_siunta(
    shipment_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await shipment_service.delete_shipment(session, shipment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
