from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.siunta import (
    ShipmentCreate,
    ShipmentPaymentRequest,
    ShipmentResponse,
    ShipmentUpdate,
)
from app.services.shipment_service import (
    create_shipment,
    delete_shipment,
    deliver_shipment,
    dispatch_shipment,
    get_shipment,
    list_shipments,
    pay_shipment,
    pickup_shipment,
    update_shipment,
)

router = APIRouter(prefix="/shipments", tags=["shipments"])
session_dependency = Depends(get_session)


@router.get("", response_model=list[ShipmentResponse])
async def get_shipments(session: AsyncSession = session_dependency) -> list[ShipmentResponse]:
    return await list_shipments(session)


@router.get("/{shipment_id}", response_model=ShipmentResponse)
async def get_shipment_by_id(
    shipment_id: int,
    session: AsyncSession = session_dependency,
) -> ShipmentResponse:
    return await get_shipment(session, shipment_id)


@router.post("", response_model=ShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment_endpoint(
    payload: ShipmentCreate,
    session: AsyncSession = session_dependency,
) -> ShipmentResponse:
    return await create_shipment(session, payload)


@router.put("/{shipment_id}", response_model=ShipmentResponse)
async def update_shipment_endpoint(
    shipment_id: int,
    payload: ShipmentUpdate,
    session: AsyncSession = session_dependency,
) -> ShipmentResponse:
    return await update_shipment(session, shipment_id, payload)


@router.delete("/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shipment_endpoint(
    shipment_id: int,
    session: AsyncSession = session_dependency,
) -> Response:
    await delete_shipment(session, shipment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{shipment_id}/pay", response_model=ShipmentResponse)
async def pay_shipment_endpoint(
    shipment_id: int,
    payload: ShipmentPaymentRequest,
    session: AsyncSession = session_dependency,
) -> ShipmentResponse:
    return await pay_shipment(session, shipment_id, payload)


@router.post("/{shipment_id}/dispatch", response_model=ShipmentResponse)
async def dispatch_shipment_endpoint(
    shipment_id: int,
    session: AsyncSession = session_dependency,
) -> ShipmentResponse:
    return await dispatch_shipment(session, shipment_id)


@router.post("/{shipment_id}/deliver", response_model=ShipmentResponse)
async def deliver_shipment_endpoint(
    shipment_id: int,
    session: AsyncSession = session_dependency,
) -> ShipmentResponse:
    return await deliver_shipment(session, shipment_id)


@router.post("/{shipment_id}/pickup", response_model=ShipmentResponse)
async def pickup_shipment_endpoint(
    shipment_id: int,
    session: AsyncSession = session_dependency,
) -> ShipmentResponse:
    return await pickup_shipment(session, shipment_id)
