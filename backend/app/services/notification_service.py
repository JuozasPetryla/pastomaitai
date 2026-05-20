import base64
import datetime

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.notification import Pranesimas, PranesimoTipas
from app.models.person import Gavejas, Siuntejas
from app.models.shipment import Siunta, SiuntosBusena
from app.schemas.notification import (
    PranesimasCreate,
    PranesimasListItem,
    PranesimasRead,
    PranesimasUpdate,
)
from app.services import sticker_service

BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email"
BREVO_SMS_ENDPOINT = "https://api.brevo.com/v3/transactionalSMS/sms"


async def list_notifications(
    session: AsyncSession,
    *,
    person_id: int | None = None,
    type_filter: PranesimoTipas | None = None,
    is_sent: bool | None = None,
) -> list[PranesimasListItem]:
    statement = select(Pranesimas)

    if person_id is not None:
        statement = statement.where(Pranesimas.asmuo_id == person_id)

    if type_filter is not None:
        statement = statement.where(Pranesimas.tipas == type_filter)

    if is_sent is not None:
        statement = statement.where(Pranesimas.issiustas == is_sent)

    statement = statement.order_by(Pranesimas.created_at.desc())
    result = await session.scalars(statement)

    return [PranesimasListItem.model_validate(notification) for notification in result.all()]


async def get_notification(session: AsyncSession, notification_id: int) -> PranesimasRead:
    statement = select(Pranesimas).where(Pranesimas.id == notification_id)
    notification = await session.scalar(statement)

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return PranesimasRead.model_validate(notification)


async def create_notification(
    session: AsyncSession, payload: PranesimasCreate
) -> PranesimasRead:
    notification = Pranesimas(
        asmuo_id=payload.asmuo_id,
        tekstas=payload.tekstas,
        tipas=payload.tipas,
        issiuntimo_operatoriui_data=payload.issiuntimo_operatoriui_data,
        issiustas=False,
    )

    session.add(notification)
    await session.commit()
    return await get_notification(session, notification.id)


async def update_notification(
    session: AsyncSession,
    notification_id: int,
    payload: PranesimasUpdate,
) -> PranesimasRead:
    notification = await get_notification_model(session, notification_id)

    if payload.tekstas is not None:
        notification.tekstas = payload.tekstas

    if payload.tipas is not None:
        notification.tipas = payload.tipas

    if payload.issiuntimo_operatoriui_data is not None:
        notification.issiuntimo_operatoriui_data = payload.issiuntimo_operatoriui_data

    if payload.operatoriaus_atsako_data is not None:
        notification.operatoriaus_atsako_data = payload.operatoriaus_atsako_data

    if payload.issiustas is not None:
        notification.issiustas = payload.issiustas

    await session.commit()
    return await get_notification(session, notification_id)


async def delete_notification(session: AsyncSession, notification_id: int) -> None:
    notification = await get_notification_model(session, notification_id)
    await session.delete(notification)
    await session.commit()


async def get_notification_model(
    session: AsyncSession, notification_id: int
) -> Pranesimas:
    statement = select(Pranesimas).where(Pranesimas.id == notification_id)
    notification = await session.scalar(statement)

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    return notification


def create_sender_sms_text(shipment: Siunta, status: SiuntosBusena) -> str:
    if status == SiuntosBusena.tranzite:
        return (
            f"Jūsų siunta {shipment.siuntos_kodas} yra tranzite. "
            f"Siunta keliauja į adresą {shipment.gavimo_adresas}."
        )
    return (
        f"Jūsų siunta {shipment.siuntos_kodas} buvo pristatyta. "
        f"Gavėjas gavo siuntą adresu {shipment.gavimo_adresas}."
    )


def create_recipient_sms_text(shipment: Siunta, status: SiuntosBusena) -> str:
    if status == SiuntosBusena.tranzite:
        return (
            f"Jūsų siunta {shipment.siuntos_kodas} yra tranzite. "
            f"Ji bus pristatyta adresu {shipment.gavimo_adresas}."
        )
    return (
        f"Jūsų siunta {shipment.siuntos_kodas} buvo pristatyta. "
        "Dėkojame, kad naudojatės Pastomatais."
    )


def create_sender_email_text(shipment: Siunta, status: SiuntosBusena) -> str:
    if status == SiuntosBusena.tranzite:
        return (
            f"Sveiki {shipment.siuntejas.asmuo.vardas} {shipment.siuntejas.asmuo.pavarde},\n\n"
            f"Jūsų siunta {shipment.siuntos_kodas} yra tranzite ir keliauja "
            f"į gavėjo adresą {shipment.gavimo_adresas}."
            "\n\nSekite siuntos būklę savo paskyroje ir paruoškite gavėją siuntos priėmimui."
        )
    return (
        f"Sveiki {shipment.siuntejas.asmuo.vardas} {shipment.siuntejas.asmuo.pavarde},\n\n"
        f"Jūsų siunta {shipment.siuntos_kodas} buvo pristatyta gavėjui "
        f"adresu {shipment.gavimo_adresas}."
        "\n\nAčiū, kad naudojatės Pastomatais."
    )


def create_recipient_email_text(shipment: Siunta, status: SiuntosBusena) -> str:
    if status == SiuntosBusena.tranzite:
        return (
            f"Sveiki {shipment.gavejas.asmuo.vardas} {shipment.gavejas.asmuo.pavarde},\n\n"
            f"Jūsų siunta {shipment.siuntos_kodas} yra tranzite ir bus pristatyta "
            f"adresu {shipment.gavimo_adresas}."
            "\n\nSekite pristatymo eigą ir pasiruoškite priimti siuntą."
        )
    return (
        f"Sveiki {shipment.gavejas.asmuo.vardas} {shipment.gavejas.asmuo.pavarde},\n\n"
        f"Jūsų siunta {shipment.siuntos_kodas} buvo pristatyta adresu "
        f"{shipment.gavimo_adresas}."
        "\n\nAčiū, kad naudojatės Pastomatais."
    )


# def _build_notifications(shipment: Siunta, status: SiuntosBusena) -> list[Pranesimas]:
#     return [
#         Pranesimas(
#             asmuo_id=shipment.siuntejas.asmuo.id,
#             tekstas=create_sender_sms_text(shipment, status),
#             tipas=PranesimoTipas.sms,
#             issiustas=False,
#         ),
#         Pranesimas(
#             asmuo_id=shipment.siuntejas.asmuo.id,
#             tekstas=create_sender_email_text(shipment, status),
#             tipas=PranesimoTipas.el_pastas,
#             issiustas=False,
#         ),
#         Pranesimas(
#             asmuo_id=shipment.gavejas.asmuo.id,
#             tekstas=create_recipient_sms_text(shipment, status),
#             tipas=PranesimoTipas.sms,
#             issiustas=False,
#         ),
#         Pranesimas(
#             asmuo_id=shipment.gavejas.asmuo.id,
#             tekstas=create_recipient_email_text(shipment, status),
#             tipas=PranesimoTipas.el_pastas,
#             issiustas=False,
#         ),
#     ]


async def create_messages(
    session: AsyncSession, shipment_id: int, status: SiuntosBusena
) -> int:
    if status not in (SiuntosBusena.tranzite, SiuntosBusena.pristatyta):
        return 0

    statement = select(Siunta).options(
        selectinload(Siunta.siuntejas).selectinload(Siuntejas.asmuo),
        selectinload(Siunta.gavejas).selectinload(Gavejas.asmuo),
    ).where(Siunta.id == shipment_id)
    shipment = await session.scalar(statement)

    if shipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shipment not found")

    notifications = [
        Pranesimas(
            asmuo_id=shipment.siuntejas.asmuo.id,
            tekstas=create_sender_sms_text(shipment, status),
            tipas=PranesimoTipas.sms,
            issiustas=False,
        ),
        Pranesimas(
            asmuo_id=shipment.siuntejas.asmuo.id,
            tekstas=create_sender_email_text(shipment, status),
            tipas=PranesimoTipas.el_pastas,
            issiustas=False,
        ),
        Pranesimas(
            asmuo_id=shipment.gavejas.asmuo.id,
            tekstas=create_recipient_sms_text(shipment, status),
            tipas=PranesimoTipas.sms,
            issiustas=False,
        ),
        Pranesimas(
            asmuo_id=shipment.gavejas.asmuo.id,
            tekstas=create_recipient_email_text(shipment, status),
            tipas=PranesimoTipas.el_pastas,
            issiustas=False,
        ),
    ]
    session.add_all(notifications)
    await session.flush()

    return len(notifications)


async def send_brevo_sms(phone_number: str, text: str) -> bool:
    if not settings.brevo_api_key or not settings.brevo_sms_sender:
        print("Brevo API key or SMS sender not configured")
        return False

    payload = {
        "sender": settings.brevo_sms_sender,
        "recipient": phone_number,
        "content": text,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                BREVO_SMS_ENDPOINT,
                json=payload,
                headers={"accept": "application/json", "api-key": settings.brevo_api_key},
                timeout=15,
            )
            print(f"SMS send response: {response.status_code} - {response.text}")
    except httpx.HTTPError:
        print("Failed to send SMS via Brevo")
        return False

    return 200 <= response.status_code < 300


async def send_brevo_email(recipient_email: str, subject: str, text_content: str) -> bool:
    if not settings.brevo_api_key or not settings.brevo_sender_email:
        print("Brevo API key or sender email not configured")
        return False

    payload = {
        "sender": {
            "email": settings.brevo_sender_email,
            "name": settings.brevo_sender_name,
        },
        "to": [{"email": recipient_email}],
        "subject": subject,
        "textContent": text_content,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                BREVO_EMAIL_ENDPOINT,
                json=payload,
                headers={"accept": "application/json", "api-key": settings.brevo_api_key},
                timeout=15,
            )
            print(f"Email send response: {response.status_code} - {response.text}")
    except httpx.HTTPError:
        print("Failed to send email via Brevo")
        return False

    return 200 <= response.status_code < 300


async def send_brevo_email_with_attachments(
    recipient_email: str,
    subject: str,
    text_content: str,
    attachments: list[dict[str, str]],
) -> bool:
    if not settings.brevo_api_key or not settings.brevo_sender_email:
        print("Brevo API key or sender email not configured")
        return False

    payload = {
        "sender": {
            "email": settings.brevo_sender_email,
            "name": settings.brevo_sender_name,
        },
        "to": [{"email": recipient_email}],
        "subject": subject,
        "textContent": text_content,
        "attachment": attachments,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                BREVO_EMAIL_ENDPOINT,
                json=payload,
                headers={"accept": "application/json", "api-key": settings.brevo_api_key},
                timeout=15,
            )
            print(f"Email with attachment send response: {response.status_code} - {response.text}")
    except httpx.HTTPError:
        print("Failed to send email with attachment via Brevo")
        return False

    return 200 <= response.status_code < 300


def create_registration_confirmation_email_text(shipment: Siunta) -> str:
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


async def send_registration_confirmation_email(
    shipment: Siunta,
    *,
    recipient_email: str | None = None,
) -> bool:
    sticker_data = sticker_service.build_sticker_data_from_shipment(shipment)
    sticker_pdf = sticker_service.generate_sticker_pdf(sticker_data)
    attachment_name = f"sticker_{shipment.siuntos_kodas}.pdf"
    confirmation_recipient = recipient_email or shipment.siuntejas.asmuo.el_pastas
    return await send_brevo_email_with_attachments(
        recipient_email=confirmation_recipient,
        subject=f"Siunta {shipment.siuntos_kodas} užregistruota",
        text_content=create_registration_confirmation_email_text(shipment),
        attachments=[
            {
                "name": attachment_name,
                "content": base64.b64encode(sticker_pdf).decode("ascii"),
            }
        ],
    )


async def send_unsent_sms_messages(session: AsyncSession) -> int:
    statement = select(Pranesimas).options(selectinload(Pranesimas.asmuo)).where(
        Pranesimas.issiuntimo_operatoriui_data.is_(None),
        Pranesimas.tipas == PranesimoTipas.sms,
    )
    result = await session.scalars(statement)
    messages = result.all()

    for message in messages:
        message.issiuntimo_operatoriui_data = datetime.datetime.now(datetime.UTC)
        success = await send_brevo_sms(message.asmuo.telefono_nr, message.tekstas)
        message.operatoriaus_atsako_data = datetime.datetime.now(datetime.UTC)
        if success:
            message.issiustas = True

    if messages:
        await session.commit()

    return len(messages)


async def send_unsent_email_messages(session: AsyncSession) -> int:
    statement = select(Pranesimas).options(selectinload(Pranesimas.asmuo)).where(
        Pranesimas.issiuntimo_operatoriui_data.is_(None),
        Pranesimas.tipas == PranesimoTipas.el_pastas,
    )
    result = await session.scalars(statement)
    messages = result.all()

    for message in messages:
        subject = "Siuntos būsena"
        message.issiuntimo_operatoriui_data = datetime.datetime.now(datetime.UTC)
        success = await send_brevo_email(message.asmuo.el_pastas, subject, message.tekstas)
        message.operatoriaus_atsako_data = datetime.datetime.now(datetime.UTC)
        if success:
            message.issiustas = True

    if messages:
        await session.commit()

    return len(messages)
