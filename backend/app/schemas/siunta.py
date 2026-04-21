from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.siunta import SiuntosBusena, SiuntosDydis


class ShipmentPartyBase(BaseModel):
    vardas: str = Field(min_length=1, max_length=100)
    pavarde: str = Field(min_length=1, max_length=100)
    telefono_nr: str = Field(min_length=3, max_length=32)
    el_pastas: str = Field(min_length=3, max_length=255)


class ShipmentPartyResponse(ShipmentPartyBase):
    model_config = ConfigDict(from_attributes=True)

    asmuo_id: int


class ShipmentCreate(BaseModel):
    siuntejas: ShipmentPartyBase
    gavejas: ShipmentPartyBase
    dydis: SiuntosDydis
    gavimo_adresas: str = Field(min_length=3, max_length=255)
    siuntimo_adresas: str = Field(min_length=3, max_length=255)
    data: date = Field(default_factory=date.today)
    suma: Decimal | None = Field(default=None, ge=0, decimal_places=2, max_digits=10)
    saskaita: str | None = Field(default=None, max_length=255)
    apmokamas_pastomate: bool = False
    pastomato_skyrius_id: int | None = None


class ShipmentUpdate(BaseModel):
    siuntejas: ShipmentPartyBase | None = None
    gavejas: ShipmentPartyBase | None = None
    dydis: SiuntosDydis | None = None
    gavimo_adresas: str | None = Field(default=None, min_length=3, max_length=255)
    siuntimo_adresas: str | None = Field(default=None, min_length=3, max_length=255)
    data: date | None = None
    suma: Decimal | None = Field(default=None, ge=0, decimal_places=2, max_digits=10)
    saskaita: str | None = Field(default=None, max_length=255)
    apmokamas_pastomate: bool | None = None
    pastomato_skyrius_id: int | None = None
    busena: SiuntosBusena | None = None


class ShipmentPaymentRequest(BaseModel):
    budas: Literal["internet", "pastomatas"] = "internet"


class ShipmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    uzsakymo_nr: int
    siuntos_kodas: str
    dydis: SiuntosDydis
    gavimo_adresas: str
    siuntimo_adresas: str
    data: date
    busena: SiuntosBusena
    suma: Decimal
    saskaita: str | None
    apmokamas_pastomate: bool
    pastomato_skyrius_id: int | None
    created_at: datetime
    updated_at: datetime
    siuntejas: ShipmentPartyResponse
    gavejas: ShipmentPartyResponse
