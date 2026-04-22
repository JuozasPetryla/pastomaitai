from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.person import DarbuotojoPareigos

class AsmuoBase(BaseModel):
    telefono_nr: str
    el_pastas: EmailStr
    vardas: str
    pavarde: str


class DarbuotojasCreate(AsmuoBase):
    pareigos: DarbuotojoPareigos


class DarbuotojasUpdate(BaseModel):
    telefono_nr: str | None = None
    el_pastas: EmailStr | None = None
    vardas: str | None = None
    pavarde: str | None = None
    pareigos: DarbuotojoPareigos | None = None


class DarbuotojasListItem(BaseModel):
    id: int
    telefono_nr: str
    el_pastas: EmailStr
    vardas: str
    pavarde: str
    pareigos: DarbuotojoPareigos


class DarbuotojasRead(DarbuotojasListItem):
    created_at: datetime
    updated_at: datetime
    

class AsmuoRead(BaseModel):
    id: int
    telefono_nr: str
    el_pastas: EmailStr
    vardas: str
    pavarde: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
