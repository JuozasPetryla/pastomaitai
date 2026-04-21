from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.pastomatas import PastomatoBusena
from app.models.siunta import SiuntosBusena, SiuntosDydis
from app.schemas.siunta import ShipmentPartyBase, ShipmentResponse


class PastomatoSkyriusRead(BaseModel):
    id: int
    dydis: SiuntosDydis
    numeris: int

    model_config = ConfigDict(from_attributes=True)


class PastomatasListItem(BaseModel):
    id: int
    adresas: str
    busena: PastomatoBusena
    produkto_kodas: str
    skyriu_skaicius: int


class PastomatasRead(BaseModel):
    id: int
    adresas: str
    busena: PastomatoBusena
    produkto_kodas: str
    created_at: datetime
    updated_at: datetime
    skyriai: list[PastomatoSkyriusRead]

    model_config = ConfigDict(from_attributes=True)


class PastomatoSarasasFilters(BaseModel):
    regionas: str | None = None
    busena: PastomatoBusena | None = None


class PastomatoSkyriuGrupe(BaseModel):
    dydis: SiuntosDydis
    kiekis: int = Field(ge=1, le=500)


class PastomatasCreate(BaseModel):
    adresas: str = Field(min_length=3, max_length=255)
    produkto_kodas: str = Field(min_length=2, max_length=64)
    skyriai: list[PastomatoSkyriuGrupe] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_total_compartments(self) -> "PastomatasCreate":
        if sum(grupe.kiekis for grupe in self.skyriai) > 500:
            raise ValueError("Pastomatas gali tureti ne daugiau kaip 500 skyriu")
        return self


class PastomatasUpdate(BaseModel):
    adresas: str | None = Field(default=None, min_length=3, max_length=255)
    busena: PastomatoBusena | None = None
    produkto_kodas: str | None = Field(default=None, min_length=2, max_length=64)

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "PastomatasUpdate":
        if self.adresas is None and self.busena is None and self.produkto_kodas is None:
            raise ValueError("Reikia pateikti bent viena keiciama lauka")
        return self


class LockerRegistrationRequest(BaseModel):
    siuntejas: ShipmentPartyBase
    gavejas: ShipmentPartyBase
    dydis: SiuntosDydis
    gavimo_adresas: str = Field(min_length=3, max_length=255)
    siuntimo_adresas: str = Field(min_length=3, max_length=255)
    data: date
    saskaita: str | None = Field(default=None, max_length=255)


class LockerShipmentCodeRequest(BaseModel):
    siuntos_kodas: str = Field(min_length=3, max_length=64)


class LockerSendRequest(LockerShipmentCodeRequest):
    skyriaus_id: int = Field(ge=1)


class LockerCellResponse(BaseModel):
    id: int
    numeris: int
    dydis: SiuntosDydis
    uzimtas: bool
    dureles_atidarytos: bool
    siuntos_kodas: str | None = None
    siuntos_busena: SiuntosBusena | None = None


class LockerActiveSessionResponse(BaseModel):
    veiksmas: Literal["idejimas", "atsiemimas"]
    siuntos_id: int
    siuntos_kodas: str
    skyriaus_id: int
    skyriaus_numeris: int
    dureles_atidarytos: bool


class LockerStateResponse(BaseModel):
    id: int
    produkto_kodas: str
    adresas: str
    busena: PastomatoBusena
    created_at: datetime
    updated_at: datetime
    skyriai: list[LockerCellResponse]
    aktyvi_sesija: LockerActiveSessionResponse | None = None


class LockerActionResponse(BaseModel):
    zinute: str
    locker: LockerStateResponse
    siunta: ShipmentResponse | None = None
