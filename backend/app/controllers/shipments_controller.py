from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.siunta import SiuntosBusena
from app.schemas.siunta import ShipmentCreate, ShipmentListItem, ShipmentResponse, ShipmentUpdate
from app.services import shipment_service

router = APIRouter(prefix="/shipments", tags=["shipments"])


@router.get("", response_model=list[ShipmentListItem])
async def list_shipments(
    session: Annotated[AsyncSession, Depends(get_session)],
    shipment_code: Annotated[str | None, Query(description="Filter by shipment code")] = None,
    status_filter: SiuntosBusena | None = Query(default=None, alias="status"),
) -> list[ShipmentListItem]:
    return await shipment_service.list_shipments(
        session,
        shipment_code=shipment_code,
        status_filter=status_filter,
    )


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment_details(
    shipment_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ShipmentResponse:
    return await shipment_service.get_shipment(session, shipment_id)


@router.post("", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    payload: ShipmentCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ShipmentResponse:
    return await shipment_service.create_shipment(session, payload)


@router.patch("/{shipment_id}", response_model=ShipmentResponse)
async def update_shipment(
    shipment_id: int,
    payload: ShipmentUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ShipmentResponse:
    return await shipment_service.update_shipment(session, shipment_id, payload)


@router.delete("/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shipment(
    shipment_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await shipment_service.delete_shipment(session, shipment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
