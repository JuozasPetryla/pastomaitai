import enum
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class PranesimoTipas(str, enum.Enum):
    sms = "sms"
    el_pastas = "el_pastas"


class Pranesimas(Base):
    __tablename__ = "pranesimai"
    __table_args__ = (
        Index("ix_pranesimai_asmuo_id", "asmuo_id"),
        Index("ix_pranesimai_issiustas", "issiustas"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    asmuo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("asmenys.id", ondelete="CASCADE"),
        nullable=False,
    )
    tekstas: Mapped[str] = mapped_column(Text, nullable=False)
    tipas: Mapped[PranesimoTipas] = mapped_column(
        Enum(PranesimoTipas, name="pranesimo_tipas"),
        nullable=False,
    )
    issiuntimo_operatoriui_data: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    operatoriaus_atsako_data: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    issiustas: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    asmuo: Mapped["Asmuo"] = relationship(back_populates="pranesimai")
