import os
import tempfile
from datetime import date
from io import BytesIO

import qrcode
from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from pydantic import BaseModel, Field


class StickerRequestParty(BaseModel):
    name: str = Field(..., description="Vardas ir pavardė arba įmonės pavadinimas")
    phone: str = Field(..., description="Telefono numeris")
    email: str = Field(..., description="Elektroninis paštas")


class StickerRequest(BaseModel):
    shipment_id: str = Field(..., description="Siuntos ID arba kodas")
    parcel_info: str = Field(..., description="Siuntos informacija (pvz., dydis, svoris)")
    sender: StickerRequestParty = Field(..., description="Siuntėjo informacija")
    receiver: StickerRequestParty = Field(..., description="Gavėjo informacija")
    parcel_date: date = Field(default_factory=date.today, description="Siuntos data")


router = APIRouter(prefix="/stickers", tags=["stickers"])


@router.post("/generate", responses={200: {"content": {"application/pdf": {}}}})
async def generate_sticker(request: StickerRequest) -> Response:
    identifier = request.shipment_id
    
    # 1. Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(identifier)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR code to a temporary file
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_qr:
        img.save(tmp_qr.name)
        qr_path = tmp_qr.name
        
    try:
        # 2. Generate PDF
        pdf = FPDF(orientation="P", unit="mm", format="A4")
        pdf.add_page()
        
        pdf.set_font("helvetica", style="B", size=16)
        pdf.cell(0, 10, txt="Parcel Sticker", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)
        
        pdf.set_font("helvetica", size=12)
        pdf.cell(0, 10, txt=f"Identifier: {identifier}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 10, txt=f"Date: {request.parcel_date.isoformat()}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        pdf.set_font("helvetica", style="B", size=12)
        pdf.cell(0, 10, txt="Parcel Information:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=12)
        pdf.multi_cell(0, 10, txt=request.parcel_info, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        pdf.set_font("helvetica", style="B", size=12)
        pdf.cell(0, 10, txt="Sender:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=12)
        pdf.cell(0, 10, txt=f"Name: {request.sender.name}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 10, txt=f"Phone: {request.sender.phone}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 10, txt=f"Email: {request.sender.email}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(5)
        
        pdf.set_font("helvetica", style="B", size=12)
        pdf.cell(0, 10, txt="Receiver:", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", size=12)
        pdf.cell(0, 10, txt=f"Name: {request.receiver.name}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 10, txt=f"Phone: {request.receiver.phone}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 10, txt=f"Email: {request.receiver.email}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(10)
        
        # Add QR Code Image centered
        # Page width is 210mm. QR width is 50mm. x = (210-50)/2 = 80
        pdf.image(qr_path, x=80, y=pdf.get_y(), w=50)
        
        pdf_bytes = pdf.output()
        # in some versions, output returns bytes/bytearray, in others a string
        if isinstance(pdf_bytes, str):
            pdf_bytes = pdf_bytes.encode("latin-1")
            
    finally:
        if os.path.exists(qr_path):
            os.remove(qr_path)
            
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="sticker_{identifier}.pdf"'},
    )


@router.get("/test", responses={200: {"content": {"application/pdf": {}}}})
async def test_generate_sticker() -> Response:
    """A convenient GET endpoint for testing PDF generation directly from the browser."""
    dummy_request = StickerRequest(
        shipment_id="TEST-123456789",
        parcel_info="Dydis: M, Svoris: 2kg",
        sender=StickerRequestParty(
            name="Jonas Jonaitis",
            phone="+37060000000",
            email="jonas.jonaitis@example.com"
        ),
        receiver=StickerRequestParty(
            name="Petras Petraitis",
            phone="+37061111111",
            email="petras.petraitis@example.com"
        ),
        parcel_date=date.today()
    )
    return await generate_sticker(dummy_request)
