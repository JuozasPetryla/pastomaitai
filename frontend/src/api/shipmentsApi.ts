import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type {
  Shipment,
  ShipmentCreatePayload,
  ShipmentFilters,
  ShipmentListItem,
  ShipmentUpdatePayload,
} from '../models/shipment';

type ApiShipmentStatus =
  | 'parengta'
  | 'apmoketa'
  | 'uzregistruota'
  | 'ideta'
  | 'tranzite'
  | 'pristatyta'
  | 'atsiimta'
  | 'atsaukta';

type ShipmentPartyResponse = {
  asmuo_id: number;
  vardas: string;
  pavarde: string;
  telefono_nr: string;
  el_pastas: string;
};

type ShipmentListItemResponse = {
  id: number;
  siuntos_kodas: string;
  busena: ApiShipmentStatus;
  dydis: Shipment['size'];
  siuntimo_adresas: string;
  gavimo_adresas: string;
  data: string;
  created_at: string;
  siuntejas: string;
  gavejas: string;
};

type ShipmentResponse = {
  id: number;
  uzsakymo_nr: number;
  siuntos_kodas: string;
  dydis: Shipment['size'];
  gavimo_adresas: string;
  siuntimo_adresas: string;
  data: string;
  busena: ApiShipmentStatus;
  suma: number | string;
  saskaita: string | null;
  apmokamas_pastomate: boolean;
  pastomato_skyrius_id: number | null;
  created_at: string;
  updated_at: string;
  siuntejas: ShipmentPartyResponse;
  gavejas: ShipmentPartyResponse;
};

const shipmentStatusFromApi: Record<ApiShipmentStatus, Shipment['status']> = {
  parengta: 'prepared',
  apmoketa: 'paid',
  uzregistruota: 'registered',
  ideta: 'inserted',
  tranzite: 'in_transit',
  pristatyta: 'delivered',
  atsiimta: 'collected',
  atsaukta: 'cancelled',
};

const shipmentStatusToApi: Record<Shipment['status'], ApiShipmentStatus> = {
  prepared: 'parengta',
  paid: 'apmoketa',
  registered: 'uzregistruota',
  inserted: 'ideta',
  in_transit: 'tranzite',
  delivered: 'pristatyta',
  collected: 'atsiimta',
  cancelled: 'atsaukta',
};

function toShipmentParty(party: ShipmentPartyResponse): Shipment['sender'] {
  return {
    personId: party.asmuo_id,
    firstName: party.vardas,
    lastName: party.pavarde,
    phoneNumber: party.telefono_nr,
    email: party.el_pastas,
  };
}

function toShipmentListItem(response: ShipmentListItemResponse): ShipmentListItem {
  return {
    id: response.id,
    shipmentCode: response.siuntos_kodas,
    status: shipmentStatusFromApi[response.busena],
    size: response.dydis,
    dispatchAddress: response.siuntimo_adresas,
    destinationAddress: response.gavimo_adresas,
    shipmentDate: response.data,
    createdAt: response.created_at,
    sender: response.siuntejas,
    receiver: response.gavejas,
  };
}

function toShipment(response: ShipmentResponse): Shipment {
  return {
    id: response.id,
    orderNumber: response.uzsakymo_nr,
    shipmentCode: response.siuntos_kodas,
    size: response.dydis,
    destinationAddress: response.gavimo_adresas,
    dispatchAddress: response.siuntimo_adresas,
    shipmentDate: response.data,
    status: shipmentStatusFromApi[response.busena],
    amount: Number(response.suma),
    invoice: response.saskaita,
    paymentAtLocker: response.apmokamas_pastomate,
    lockerCellId: response.pastomato_skyrius_id,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    sender: toShipmentParty(response.siuntejas),
    receiver: toShipmentParty(response.gavejas),
  };
}

function toPayload(payload: ShipmentCreatePayload | ShipmentUpdatePayload) {
  return {
    ...(payload.sender
      ? {
          siuntejas: {
            vardas: payload.sender.firstName,
            pavarde: payload.sender.lastName,
            telefono_nr: payload.sender.phoneNumber,
            el_pastas: payload.sender.email,
          },
        }
      : {}),
    ...(payload.receiver
      ? {
          gavejas: {
            vardas: payload.receiver.firstName,
            pavarde: payload.receiver.lastName,
            telefono_nr: payload.receiver.phoneNumber,
            el_pastas: payload.receiver.email,
          },
        }
      : {}),
    ...(payload.size ? { dydis: payload.size } : {}),
    ...(payload.destinationAddress ? { gavimo_adresas: payload.destinationAddress } : {}),
    ...(payload.dispatchAddress ? { siuntimo_adresas: payload.dispatchAddress } : {}),
    ...(payload.shipmentDate ? { data: payload.shipmentDate } : {}),
    ...(payload.paymentAtLocker !== undefined
      ? { apmokamas_pastomate: payload.paymentAtLocker }
      : {}),
    ...('status' in payload && payload.status
      ? { busena: shipmentStatusToApi[payload.status] }
      : {}),
  };
}

export async function fetchShipments(filters: ShipmentFilters): Promise<ShipmentListItem[]> {
  const searchParams = new URLSearchParams();

  if (filters.shipmentCode) {
    searchParams.set('shipment_code', filters.shipmentCode);
  }

  if (filters.status) {
    searchParams.set('status', shipmentStatusToApi[filters.status]);
  }

  const query = searchParams.toString();
  const response = await apiGet<ShipmentListItemResponse[]>(
    `/api/shipments${query ? `?${query}` : ''}`,
  );

  return response.map(toShipmentListItem);
}

export async function fetchShipment(id: number): Promise<Shipment> {
  const response = await apiGet<ShipmentResponse>(`/api/shipments/${id}`);
  return toShipment(response);
}

export async function createShipment(payload: ShipmentCreatePayload): Promise<Shipment> {
  const response = await apiPost<ShipmentResponse, ReturnType<typeof toPayload>>(
    '/api/shipments',
    toPayload(payload),
  );
  return toShipment(response);
}

export async function updateShipment(id: number, payload: ShipmentUpdatePayload): Promise<Shipment> {
  const response = await apiPatch<ShipmentResponse, ReturnType<typeof toPayload>>(
    `/api/shipments/${id}`,
    toPayload(payload),
  );
  return toShipment(response);
}

export async function deleteShipment(id: number): Promise<void> {
  await apiDelete(`/api/shipments/${id}`);
}
