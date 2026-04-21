import { apiGet, apiRequest } from './client';
import type { PaymentMethod, Shipment, ShipmentUpsert } from '../models/shipment';

type ShipmentPartyResponse = {
  asmuo_id: number;
  vardas: string;
  pavarde: string;
  telefono_nr: string;
  el_pastas: string;
};

export type ShipmentResponse = {
  id: number;
  uzsakymo_nr: number;
  siuntos_kodas: string;
  dydis: Shipment['dydis'];
  gavimo_adresas: string;
  siuntimo_adresas: string;
  data: string;
  busena: Shipment['busena'];
  suma: number | string;
  saskaita: string | null;
  apmokamas_pastomate: boolean;
  pastomato_skyrius_id: number | null;
  created_at: string;
  updated_at: string;
  siuntejas: ShipmentPartyResponse;
  gavejas: ShipmentPartyResponse;
};

function toShipmentParty(party: ShipmentPartyResponse): Shipment['siuntejas'] {
  return {
    asmuoId: party.asmuo_id,
    vardas: party.vardas,
    pavarde: party.pavarde,
    telefonoNr: party.telefono_nr,
    elPastas: party.el_pastas,
  };
}

export function toShipment(response: ShipmentResponse): Shipment {
  return {
    id: response.id,
    uzsakymoNr: response.uzsakymo_nr,
    siuntosKodas: response.siuntos_kodas,
    dydis: response.dydis,
    gavimoAdresas: response.gavimo_adresas,
    siuntimoAdresas: response.siuntimo_adresas,
    data: response.data,
    busena: response.busena,
    suma: Number(response.suma),
    saskaita: response.saskaita,
    apmokamasPastomate: response.apmokamas_pastomate,
    pastomatoSkyriausId: response.pastomato_skyrius_id,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    siuntejas: toShipmentParty(response.siuntejas),
    gavejas: toShipmentParty(response.gavejas),
  };
}

function toPayload(payload: ShipmentUpsert) {
  return {
    siuntejas: {
      vardas: payload.siuntejas.vardas,
      pavarde: payload.siuntejas.pavarde,
      telefono_nr: payload.siuntejas.telefonoNr,
      el_pastas: payload.siuntejas.elPastas,
    },
    gavejas: {
      vardas: payload.gavejas.vardas,
      pavarde: payload.gavejas.pavarde,
      telefono_nr: payload.gavejas.telefonoNr,
      el_pastas: payload.gavejas.elPastas,
    },
    dydis: payload.dydis,
    gavimo_adresas: payload.gavimoAdresas,
    siuntimo_adresas: payload.siuntimoAdresas,
    ...(payload.data ? { data: payload.data } : {}),
    apmokamas_pastomate: payload.apmokamasPastomate,
    pastomato_skyrius_id: payload.pastomatoSkyriausId,
  };
}

export async function fetchShipments(): Promise<Shipment[]> {
  const shipments = await apiGet<ShipmentResponse[]>('/api/shipments');
  return shipments.map(toShipment);
}

export async function createShipment(payload: ShipmentUpsert): Promise<Shipment> {
  const shipment = await apiRequest<ShipmentResponse>('/api/shipments', {
    method: 'POST',
    body: toPayload(payload),
  });
  return toShipment(shipment);
}

export async function updateShipment(id: number, payload: ShipmentUpsert): Promise<Shipment> {
  const shipment = await apiRequest<ShipmentResponse>(`/api/shipments/${id}`, {
    method: 'PUT',
    body: toPayload(payload),
  });
  return toShipment(shipment);
}

export async function deleteShipment(id: number): Promise<void> {
  await apiRequest<void>(`/api/shipments/${id}`, {
    method: 'DELETE',
  });
}

export async function payShipment(id: number, budas: PaymentMethod): Promise<Shipment> {
  const shipment = await apiRequest<ShipmentResponse>(`/api/shipments/${id}/pay`, {
    method: 'POST',
    body: { budas },
  });
  return toShipment(shipment);
}

export async function dispatchShipment(id: number): Promise<Shipment> {
  const shipment = await apiRequest<ShipmentResponse>(`/api/shipments/${id}/dispatch`, {
    method: 'POST',
  });
  return toShipment(shipment);
}

export async function deliverShipment(id: number): Promise<Shipment> {
  const shipment = await apiRequest<ShipmentResponse>(`/api/shipments/${id}/deliver`, {
    method: 'POST',
  });
  return toShipment(shipment);
}

export async function pickupShipment(id: number): Promise<Shipment> {
  const shipment = await apiRequest<ShipmentResponse>(`/api/shipments/${id}/pickup`, {
    method: 'POST',
  });
  return toShipment(shipment);
}
