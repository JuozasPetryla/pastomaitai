from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.notification import PranesimoTipas


class PranesimasListItem(BaseModel):
    id: int
    asmuo_id: int
    tipas: PranesimoTipas
    issiustas: bool
    issiuntimo_operatoriui_data: date | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PranesimasRead(BaseModel):
    id: int
    asmuo_id: int
    tekstas: str
    tipas: PranesimoTipas
    issiuntimo_operatoriui_data: date | None
    operatoriaus_atsako_data: date | None
    issiustas: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PranesimasFiltrai(BaseModel):
    asmuo_id: int | None = None
    tipas: PranesimoTipas | None = None
    issiustas: bool | None = None


class PranesimasCreate(BaseModel):
    asmuo_id: int = Field(ge=1)
    tekstas: str = Field(min_length=1, max_length=5000)
    tipas: PranesimoTipas
    issiuntimo_operatoriui_data: date | None = None


class PranesimasUpdate(BaseModel):
    tekstas: str | None = Field(default=None, min_length=1, max_length=5000)
    tipas: PranesimoTipas | None = None
    issiuntimo_operatoriui_data: date | None = None
    operatoriaus_atsako_data: date | None = None
    issiustas: bool | None = None

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "PranesimasUpdate":
        if all(
            v is None
            for v in [
                self.tekstas,
                self.tipas,
                self.issiuntimo_operatoriui_data,
                self.operatoriaus_atsako_data,
                self.issiustas,
            ]
        ):
            raise ValueError("Reikia pateikti bent viena keiciama lauka")
        return self
