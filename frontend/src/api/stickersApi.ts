import type { Shipment } from '../models/shipment';
import { apiPostBlob } from './client';

type StickerRequestParty = {
  name: string;
  phone: string;
  email: string;
};

type StickerRequest = {
  shipment_id: string;
  parcel_info: string;
  sender: StickerRequestParty;
  receiver: StickerRequestParty;
  parcel_date: string;
};

function formatPartyName(party: Shipment['sender']): string {
  return `${party.firstName} ${party.lastName}`.trim();
}

export function buildStickerRequest(shipment: Shipment): StickerRequest {
  return {
    shipment_id: shipment.shipmentCode,
    parcel_info: [
      `Order number: ${shipment.orderNumber}`,
      `Size: ${shipment.size.toUpperCase()}`,
      `Send from: ${shipment.dispatchAddress}`,
      `Deliver to: ${shipment.destinationAddress}`,
    ].join('\n'),
    sender: {
      name: formatPartyName(shipment.sender),
      phone: shipment.sender.phoneNumber,
      email: shipment.sender.email,
    },
    receiver: {
      name: formatPartyName(shipment.receiver),
      phone: shipment.receiver.phoneNumber,
      email: shipment.receiver.email,
    },
    parcel_date: shipment.shipmentDate,
  };
}

export async function requestStickerPdf(shipment: Shipment): Promise<Blob> {
  return apiPostBlob('/api/stickers/generate', buildStickerRequest(shipment));
}
