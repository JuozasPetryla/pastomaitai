from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shipment import Siunta, SiuntosBusena
from app.schemas.payment import (
    OnlineRegistrationResponse,
    PaymentActionRequest,
    PaymentRequestRead,
    PaymentResultRead,
    RegistrationPreview,
    RegistrationSessionRead,
)
from app.schemas.shipment import ShipmentCreate
from app.services import notification_service, payment_service, shipment_service, sticker_service


@dataclass
class RegistrationSessionState:
    session_id: str
    registration_data: ShipmentCreate | None = None
    shipment_id: int | None = None
    payment_request: PaymentRequestRead | None = None


_registration_sessions: dict[str, RegistrationSessionState] = {}


def _get_session_state(session_id: str) -> RegistrationSessionState:
    session_state = _registration_sessions.get(session_id)
    if session_state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration session not found.",
        )
    return session_state


def StartSession() -> RegistrationSessionRead:
    session_id = uuid4().hex
    _registration_sessions[session_id] = RegistrationSessionState(session_id=session_id)
    return RegistrationSessionRead(session_id=session_id)


def DeleteSession(session_id: str) -> None:
    _registration_sessions.pop(session_id, None)


def ValidateFormData(session_id: str, payload: ShipmentCreate) -> RegistrationPreview:
    session_state = _get_session_state(session_id)
    session_state.registration_data = payload
    return RegistrationPreview(
        session_id=session_id,
        registration_data=payload,
        amount=Decimal(shipment_service.calculate_shipment_price(payload.dydis.value)),
    )


def ValidateRegistrationRequest(session_id: str, payload: ShipmentCreate) -> RegistrationPreview:
    return ValidateFormData(session_id, payload)


async def CreateParcel(session: AsyncSession, payload: ShipmentCreate) -> Siunta:
    return await shipment_service.create_prepared_shipment_model(session, payload)


def StoreDetails(shipment: Siunta) -> dict[str, Any]:
    return {
        "shipment_id": shipment.id,
        "shipment_code": shipment.siuntos_kodas,
    }


async def UpdateStatus(
    session: AsyncSession,
    shipment_id: int,
    shipment_status: SiuntosBusena,
) -> Siunta:
    shipment = await shipment_service.get_shipment_model(session, shipment_id)
    shipment.busena = shipment_status
    return await shipment_service.save_shipment(session, shipment)


def GenerateParcelLabel(shipment: Siunta) -> str:
    return shipment.siuntos_kodas


def CreateRegistrationConfirmationText(shipment: Siunta) -> str:
    sender = shipment.siuntejas.asmuo
    receiver = shipment.gavejas.asmuo
    return (
        f"Sveiki {sender.vardas} {sender.pavarde},\n\n"
        f"Jūsų siunta {shipment.siuntos_kodas} sėkmingai užregistruota.\n"
        f"Gavėjas: {receiver.vardas} {receiver.pavarde}\n"
        f"Siuntimas iš: {shipment.siuntimo_adresas}\n"
        f"Pristatymas į: {shipment.gavimo_adresas}\n"
        f"Dydis: {shipment.dydis.value.upper()}\n\n"
        "Siuntos lipdukas prisegtas prie šio laiško.\n\n"
        "Ačiū, kad naudojatės Pastomatais."
    )


def CreateRegistrationConfirmationMessage(
    shipment: Siunta,
    recipient_email: str | None = None,
) -> notification_service.RegistrationConfirmationEmail:
    sticker_data = sticker_service.build_sticker_data_from_shipment(shipment)
    sticker_pdf = sticker_service.generate_sticker_pdf(sticker_data)
    attachment_name = f"sticker_{shipment.siuntos_kodas}.pdf"
    return notification_service.RegistrationConfirmationEmail(
        recipient_email=recipient_email or shipment.siuntejas.asmuo.el_pastas,
        subject=f"Siunta {shipment.siuntos_kodas} užregistruota",
        text_content=CreateRegistrationConfirmationText(shipment),
        attachments=[
            notification_service.EmailAttachment(
                name=attachment_name,
                content=sticker_pdf,
            )
        ],
    )


async def RegisterParcel(
    session: AsyncSession,
    session_id: str,
    payload: ShipmentCreate,
) -> OnlineRegistrationResponse:
    ValidateRegistrationRequest(session_id, payload)
    session_state = _get_session_state(session_id)

    shipment = await CreateParcel(session, payload)
    StoreDetails(shipment)
    shipment = await UpdateStatus(session, shipment.id, SiuntosBusena.parengta)

    payment_request = payment_service.CreatePayment(shipment)
    session_state.shipment_id = shipment.id
    session_state.payment_request = payment_request

    return OnlineRegistrationResponse(
        result="payment_required",
        shipment=shipment_service.to_shipment_response(shipment),
        payment_request=payment_request,
        message="Registration created. Continue with online payment.",
    )


def RequestPaymentDetails(session_id: str) -> PaymentRequestRead:
    session_state = _get_session_state(session_id)
    if session_state.payment_request is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Payment has not been initialized for this session.",
        )
    return payment_service.RequestPaymentDetailsFromRequest(session_state.payment_request)


async def CompletePayment(
    session: AsyncSession,
    session_id: str,
    payload: PaymentActionRequest,
) -> PaymentResultRead:
    session_state = _get_session_state(session_id)
    if session_state.shipment_id is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Shipment has not been created for this session.",
        )

    payment_result, shipment = await payment_service.PayOnline(
        session,
        session_state.shipment_id,
        payload,
    )

    if payment_result == "confirmed":
        shipment = await UpdateStatus(session, shipment.id, SiuntosBusena.uzregistruota)
        parcel_label = GenerateParcelLabel(shipment)
        try:
            registration_data = session_state.registration_data
            confirmation_message = CreateRegistrationConfirmationMessage(
                shipment,
                recipient_email=(
                    registration_data.siuntejas.el_pastas if registration_data is not None else None
                ),
            )
            await notification_service.send_registration_confirmation_email(confirmation_message)
        except Exception as exc:
            print(f"Failed to send registration confirmation email: {exc}")
        return PaymentResultRead(
            result="confirmed",
            shipment=shipment_service.to_shipment_response(shipment),
            parcel_label=parcel_label,
            message="Payment confirmed and shipment registered successfully.",
        )

    if payment_result == "canceled":
        return PaymentResultRead(
            result="canceled",
            shipment=shipment_service.to_shipment_response(shipment),
            message="Payment was canceled. Shipment registration was canceled as well.",
        )

    return PaymentResultRead(
        result="unsuccessful",
        shipment=shipment_service.to_shipment_response(shipment),
        message="Payment failed. Shipment registration was canceled.",
    )
