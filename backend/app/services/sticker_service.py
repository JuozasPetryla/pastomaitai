import os
import tempfile
from dataclasses import dataclass
from datetime import date

import qrcode
from fpdf import FPDF

from app.models.shipment import Siunta


@dataclass(frozen=True)
class StickerParty:
    name: str
    phone: str
    email: str


@dataclass(frozen=True)
class StickerData:
    shipment_id: str
    parcel_info: str
    sender: StickerParty
    receiver: StickerParty
    parcel_date: date


def _party_name(first_name: str, last_name: str) -> str:
    return f"{first_name} {last_name}".strip()


def build_sticker_data_from_shipment(shipment: Siunta) -> StickerData:
    return StickerData(
        shipment_id=shipment.siuntos_kodas,
        parcel_info="\n".join(
            [
                f"Order number: {shipment.uzsakymo_nr}",
                f"Size: {shipment.dydis.value.upper()}",
                f"Send from: {shipment.siuntimo_adresas}",
                f"Deliver to: {shipment.gavimo_adresas}",
            ]
        ),
        sender=StickerParty(
            name=_party_name(shipment.siuntejas.asmuo.vardas, shipment.siuntejas.asmuo.pavarde),
            phone=shipment.siuntejas.asmuo.telefono_nr,
            email=shipment.siuntejas.asmuo.el_pastas,
        ),
        receiver=StickerParty(
            name=_party_name(shipment.gavejas.asmuo.vardas, shipment.gavejas.asmuo.pavarde),
            phone=shipment.gavejas.asmuo.telefono_nr,
            email=shipment.gavejas.asmuo.el_pastas,
        ),
        parcel_date=shipment.data,
    )


def generate_sticker_pdf(sticker: StickerData) -> bytes:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(sticker.shipment_id)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_qr:
        image.save(tmp_qr.name)
        qr_path = tmp_qr.name

    try:
        pdf = FPDF(orientation="P", unit="mm", format="A4")
        pdf.add_page()

        pdf.set_font("helvetica", style="B", size=16)
        pdf.cell(0, 10, txt="Parcel Sticker", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)

        pdf.set_font("helvetica", size=12)
        pdf.cell(0, 10, txt=f"Identifier: {sticker.shipment_id}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(
            0,
            10,
            txt=f"Date: {sticker.parcel_date.isoformat()}",
            new_x="LMARGIN",
            new_y="NEXT",
        )
        pdf.ln(5)

        pdf.set_font("helvetica", style="B", size=12)
        pdf.cell(0, 10, txt="Parcel Information:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=12)
        pdf.multi_cell(0, 10, txt=sticker.parcel_info, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        pdf.set_font("helvetica", style="B", size=12)
        pdf.cell(0, 10, txt="Sender:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=12)
        pdf.cell(0, 10, txt=f"Name: {sticker.sender.name}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 10, txt=f"Phone: {sticker.sender.phone}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 10, txt=f"Email: {sticker.sender.email}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)

        pdf.set_font("helvetica", style="B", size=12)
        pdf.cell(0, 10, txt="Receiver:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=12)
        pdf.cell(0, 10, txt=f"Name: {sticker.receiver.name}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 10, txt=f"Phone: {sticker.receiver.phone}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 10, txt=f"Email: {sticker.receiver.email}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)

        pdf.image(qr_path, x=80, y=pdf.get_y(), w=50)

        pdf_bytes = pdf.output()
        if isinstance(pdf_bytes, str):
            return pdf_bytes.encode("latin-1")
        return bytes(pdf_bytes)
    finally:
        if os.path.exists(qr_path):
            os.remove(qr_path)
