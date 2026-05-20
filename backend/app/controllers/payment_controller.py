from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.payment import PaymentActionRequest, PaymentRequestRead, PaymentResultRead
from app.services import registration_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/registration-sessions/{session_id}/details", response_model=PaymentRequestRead)
async def RequestPaymentDetails(session_id: str) -> PaymentRequestRead:
    return registration_service.RequestPaymentDetails(session_id)


@router.post(
    "/registration-sessions/{session_id}/details",
    response_model=PaymentResultRead,
    status_code=status.HTTP_200_OK,
)
async def SendPaymentDetails(
    session_id: str,
    payload: PaymentActionRequest,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PaymentResultRead:
    return await registration_service.CompletePayment(session, session_id, payload)


@router.delete("/registration-sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def DeleteSession(session_id: str) -> Response:
    registration_service.DeleteSession(session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
