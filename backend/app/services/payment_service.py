from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shipment import Siunta, SiuntosBusena
from app.schemas.payment import PaymentActionRequest, PaymentDetailsRequest, PaymentRequestRead
from app.services import shipment_service


@dataclass
class MockBankResult:
    reference_id: str
    status: Literal["confirmed", "unsuccessful"]


def CreatePayment(shipment: Siunta) -> PaymentRequestRead:
    return PaymentRequestRead(
        shipment_id=shipment.id,
        order_number=shipment.uzsakymo_nr,
        shipment_code=shipment.siuntos_kodas,
        amount=Decimal(shipment.suma),
        invoice=shipment.saskaita,
        pay_at_locker=False,
        status="online_required",
    )


def RequestPaymentDetails(shipment: Siunta) -> PaymentRequestRead:
    return CreatePayment(shipment)


def RequestPaymentDetailsFromRequest(payment_request: PaymentRequestRead) -> PaymentRequestRead:
    return payment_request


def CheckDetails(payment_details: PaymentDetailsRequest) -> None:
    card_number = payment_details.card_number.replace(" ", "")
    if not card_number.isdigit():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Card number must contain only digits.",
        )

    if len(card_number) not in {12, 13, 14, 15, 16, 18, 19}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Card number length is invalid.",
        )

    if not payment_details.cvv.isdigit():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="CVV must contain only digits.",
        )

    current_year = datetime.now(UTC).year
    current_month = datetime.now(UTC).month
    if payment_details.expiry_year < current_year or (
        payment_details.expiry_year == current_year
        and payment_details.expiry_month < current_month
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Card has expired.",
        )


def SendPaymentDetails(payment_details: PaymentDetailsRequest) -> MockBankResult:
    card_number = payment_details.card_number.replace(" ", "")
    success = not card_number.endswith("0000")
    return MockBankResult(
        reference_id=f"MOCKBANK-{uuid4().hex[:12].upper()}",
        status="confirmed" if success else "unsuccessful",
    )


def GetPaymentStatus(bank_result: MockBankResult) -> Literal["confirmed", "unsuccessful"]:
    return bank_result.status


def CheckStatus(payment_status: Literal["confirmed", "unsuccessful"]) -> bool:
    return payment_status == "confirmed"


def CheckPaymentResult(payment_status: Literal["confirmed", "unsuccessful"]) -> bool:
    return CheckStatus(payment_status)


async def SetToCancel(session: AsyncSession, shipment_id: int) -> Siunta:
    shipment = await shipment_service.get_shipment_model(session, shipment_id)
    shipment.busena = SiuntosBusena.atsaukta
    return await shipment_service.save_shipment(session, shipment)


async def SetToPayed(session: AsyncSession, shipment_id: int) -> Siunta:
    shipment = await shipment_service.get_shipment_model(session, shipment_id)
    shipment.busena = SiuntosBusena.apmoketa
    return await shipment_service.save_shipment(session, shipment)


async def PayOnline(
    session: AsyncSession,
    shipment_id: int,
    payload: PaymentActionRequest,
) -> tuple[Literal["confirmed", "canceled", "unsuccessful"], Siunta]:
    if payload.cancel_payment:
        shipment = await SetToCancel(session, shipment_id)
        return "canceled", shipment

    if payload.payment_details is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Payment details are required.",
        )

    CheckDetails(payload.payment_details)
    bank_result = SendPaymentDetails(payload.payment_details)
    payment_status = GetPaymentStatus(bank_result)

    if CheckPaymentResult(payment_status):
        shipment = await SetToPayed(session, shipment_id)
        return "confirmed", shipment

    shipment = await SetToCancel(session, shipment_id)
    return "unsuccessful", shipment
