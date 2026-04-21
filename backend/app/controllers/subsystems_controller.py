from fastapi import APIRouter

from app.schemas.subsystem import Subsystem
from app.services.subsystem_service import list_subsystems

router = APIRouter(prefix="/subsystems", tags=["subsystems"])


@router.get("")
async def get_subsystems() -> list[Subsystem]:
    return list_subsystems()
