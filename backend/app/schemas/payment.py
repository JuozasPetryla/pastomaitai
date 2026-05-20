from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.shipment import ShipmentCreate, ShipmentResponse


class RegistrationSessionRead(BaseModel):
    session_id: str


class RegistrationPreview(BaseModel):
    session_id: str
    registration_data: ShipmentCreate
    amount: Decimal = Field(decimal_places=2, max_digits=10)


class PaymentRequestRead(BaseModel):
    shipment_id: int
    order_number: int
    shipment_code: str
    amount: Decimal = Field(decimal_places=2, max_digits=10)
    invoice: str | None
    pay_at_locker: bool
    status: Literal["pending", "paid_at_locker", "online_required"]


class OnlineRegistrationResponse(BaseModel):
    result: Literal["payment_required", "registered"]
    shipment: ShipmentResponse
    payment_request: PaymentRequestRead | None = None
    parcel_label: str | None = None
    message: str


class PaymentDetailsRequest(BaseModel):
    card_holder: str = Field(min_length=2, max_length=120)
    card_number: str = Field(min_length=12, max_length=19)
    expiry_month: int = Field(ge=1, le=12)
    expiry_year: int = Field(ge=2024, le=2100)
    cvv: str = Field(min_length=3, max_length=4)


class PaymentActionRequest(BaseModel):
    cancel_payment: bool = False
    payment_details: PaymentDetailsRequest | None = None


class PaymentResultRead(BaseModel):
    result: Literal["confirmed", "canceled", "unsuccessful"]
    shipment: ShipmentResponse
    parcel_label: str | None = None
    message: str
