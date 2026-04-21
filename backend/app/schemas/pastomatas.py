from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.pastomatas import PastomatoBusena
from app.models.siunta import SiuntosDydis


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
            raise ValueError("Paštomatas gali turėti ne daugiau kaip 500 skyrių")
        return self


class PastomatasUpdate(BaseModel):
    adresas: str | None = Field(default=None, min_length=3, max_length=255)
    busena: PastomatoBusena | None = None
    produkto_kodas: str | None = Field(default=None, min_length=2, max_length=64)

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "PastomatasUpdate":
        if self.adresas is None and self.busena is None and self.produkto_kodas is None:
            raise ValueError("Reikia pateikti bent vieną keičiamą lauką")
        return self
