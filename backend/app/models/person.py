import enum
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class DarbuotojoPareigos(str, enum.Enum):
    administratorius = "administratorius"
    kurjeris = "kurjeris"


class Asmuo(Base):
    __tablename__ = "asmenys"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    telefono_nr: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    el_pastas: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    vardas: Mapped[str] = mapped_column(String(100), nullable=False)
    pavarde: Mapped[str] = mapped_column(String(100), nullable=False)
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

    siuntejas: Mapped["Siuntejas | None"] = relationship(back_populates="asmuo")
    gavejas: Mapped["Gavejas | None"] = relationship(back_populates="asmuo")
    darbuotojas: Mapped["Darbuotojas | None"] = relationship(back_populates="asmuo")
    pranesimai: Mapped[list["Pranesimas"]] = relationship(back_populates="asmuo")


class Siuntejas(Base):
    __tablename__ = "siuntejai"

    asmuo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("asmenys.id", ondelete="CASCADE"),
        primary_key=True,
    )

    asmuo: Mapped[Asmuo] = relationship(back_populates="siuntejas")
    siuntos: Mapped[list["Siunta"]] = relationship(back_populates="siuntejas")


class Gavejas(Base):
    __tablename__ = "gavejai"

    asmuo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("asmenys.id", ondelete="CASCADE"),
        primary_key=True,
    )

    asmuo: Mapped[Asmuo] = relationship(back_populates="gavejas")
    siuntos: Mapped[list["Siunta"]] = relationship(back_populates="gavejas")


class Darbuotojas(Base):
    __tablename__ = "darbuotojai"

    asmuo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("asmenys.id", ondelete="CASCADE"),
        primary_key=True,
    )
    pareigos: Mapped[DarbuotojoPareigos] = mapped_column(
        Enum(DarbuotojoPareigos, name="darbuotojo_pareigos"),
        nullable=False,
    )

    asmuo: Mapped[Asmuo] = relationship(back_populates="darbuotojas")
