import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class SiuntosBusena(str, enum.Enum):
    parengta = "parengta"
    apmoketa = "apmoketa"
    uzregistruota = "uzregistruota"
    ideta = "ideta"
    tranzite = "tranzite"
    pristatyta = "pristatyta"
    atsiimta = "atsiimta"
    atsaukta = "atsaukta"


class SiuntosDydis(str, enum.Enum):
    s = "s"
    m = "m"
    l = "l"


class Siunta(Base):
    __tablename__ = "siuntos"
    __table_args__ = (
        UniqueConstraint("pastomato_skyrius_id", name="uq_siuntos_pastomato_skyrius"),
        CheckConstraint("suma >= 0", name="ck_siuntos_suma_neneigiama"),
        Index("ix_siuntos_siuntejas_id", "siuntejas_id"),
        Index("ix_siuntos_gavejas_id", "gavejas_id"),
        Index("ix_siuntos_busena", "busena"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    uzsakymo_nr: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    siuntejas_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("siuntejai.asmuo_id", ondelete="RESTRICT"),
        nullable=False,
    )
    gavejas_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("gavejai.asmuo_id", ondelete="RESTRICT"),
        nullable=False,
    )
    pastomato_skyrius_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("pastomato_skyriai.id", ondelete="SET NULL"),
        unique=True,
    )
    dydis: Mapped[SiuntosDydis] = mapped_column(Enum(SiuntosDydis, name="siuntos_dydis"))
    gavimo_adresas: Mapped[str] = mapped_column(String(255), nullable=False)
    siuntimo_adresas: Mapped[str] = mapped_column(String(255), nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    busena: Mapped[SiuntosBusena] = mapped_column(
        Enum(SiuntosBusena, name="siuntos_busena"),
        server_default=SiuntosBusena.parengta.value,
        nullable=False,
    )
    siuntos_kodas: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    suma: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    saskaita: Mapped[str | None] = mapped_column(String(255))
    apmokamas_pastomate: Mapped[bool] = mapped_column(
        Boolean,
        server_default="false",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    siuntejas: Mapped["Siuntejas"] = relationship(back_populates="siuntos")
    gavejas: Mapped["Gavejas"] = relationship(back_populates="siuntos")
    pastomato_skyrius: Mapped["PastomatoSkyrius | None"] = relationship(back_populates="siunta")
