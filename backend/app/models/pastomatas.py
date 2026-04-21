import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.siunta import SiuntosDydis


class PastomatoBusena(str, enum.Enum):
    aktyvus = "aktyvus"
    neaktyvus = "neaktyvus"
    negali_spausdinti = "negali_spausdinti"
    panaikintas = "panaikintas"


class Pastomatas(Base):
    __tablename__ = "pastomatai"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    adresas: Mapped[str] = mapped_column(String(255), nullable=False)
    busena: Mapped[PastomatoBusena] = mapped_column(
        Enum(PastomatoBusena, name="pastomato_busena"),
        server_default=PastomatoBusena.aktyvus.value,
        nullable=False,
    )
    produkto_kodas: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
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

    skyriai: Mapped[list["PastomatoSkyrius"]] = relationship(
        back_populates="pastomatas",
        cascade="all, delete-orphan",
    )


class PastomatoSkyrius(Base):
    __tablename__ = "pastomato_skyriai"
    __table_args__ = (
        UniqueConstraint(
            "pastomatas_id",
            "numeris",
            name="uq_pastomato_skyriai_pastomatas_numeris",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    pastomatas_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("pastomatai.id", ondelete="CASCADE"),
        nullable=False,
    )
    dydis: Mapped[SiuntosDydis] = mapped_column(
        Enum(SiuntosDydis, name="siuntos_dydis"),
        nullable=False,
    )
    numeris: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    pastomatas: Mapped[Pastomatas] = relationship(back_populates="skyriai")
    siunta: Mapped["Siunta | None"] = relationship(back_populates="pastomato_skyrius")
