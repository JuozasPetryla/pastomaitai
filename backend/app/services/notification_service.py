from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pranesimas import Pranesimas, PranesimoTipas
from app.schemas.pranesimas import (
    PranesimasCreate,
    PranesimasListItem,
    PranesimasRead,
    PranesimasUpdate,
)


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
