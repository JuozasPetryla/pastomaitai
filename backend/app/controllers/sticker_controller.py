from datetime import date
from io import BytesIO

from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.sticker_service import StickerData, StickerParty, generate_sticker_pdf


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
    pdf_bytes = generate_sticker_pdf(
        StickerData(
            shipment_id=identifier,
            parcel_info=request.parcel_info,
            sender=StickerParty(
                name=request.sender.name,
                phone=request.sender.phone,
                email=request.sender.email,
            ),
            receiver=StickerParty(
                name=request.receiver.name,
                phone=request.receiver.phone,
                email=request.receiver.email,
            ),
            parcel_date=request.parcel_date,
        )
    )
            
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
