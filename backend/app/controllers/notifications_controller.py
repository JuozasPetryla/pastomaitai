from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.pranesimas import PranesimoTipas
from app.schemas.pranesimas import (
    PranesimasCreate,
    PranesimasListItem,
    PranesimasRead,
    PranesimasUpdate,
)
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[PranesimasListItem])
async def list_notifications(
    session: Annotated[AsyncSession, Depends(get_session)],
    person_id: Annotated[
        int | None,
        Query(alias="person_id", description="Filter by person ID"),
    ] = None,
    type_filter: PranesimoTipas | None = Query(default=None, alias="type"),
    is_sent: bool | None = Query(default=None, alias="is_sent"),
) -> list[PranesimasListItem]:
    return await notification_service.list_notifications(
        session,
        person_id=person_id,
        type_filter=type_filter,
        is_sent=is_sent,
    )


@router.get("/{notification_id}", response_model=PranesimasRead)
async def get_notification_details(
    notification_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PranesimasRead:
    return await notification_service.get_notification(session, notification_id)


@router.post("", response_model=PranesimasRead, status_code=status.HTTP_201_CREATED)
async def create_notification(
    payload: PranesimasCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PranesimasRead:
    return await notification_service.create_notification(session, payload)


@router.patch("/{notification_id}", response_model=PranesimasRead)
async def update_notification(
    notification_id: int,
    payload: PranesimasUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> PranesimasRead:
    return await notification_service.update_notification(session, notification_id, payload)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await notification_service.delete_notification(session, notification_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
