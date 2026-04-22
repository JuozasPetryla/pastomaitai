import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type {
  Shipment,
  ShipmentCreatePayload,
  ShipmentFilters,
  ShipmentListItem,
  ShipmentStatus,
  ShipmentUpdatePayload,
} from '../models/shipment';

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
  busena: ShipmentStatus;
  dydis: Shipment['dydis'];
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

function toShipmentListItem(response: ShipmentListItemResponse): ShipmentListItem {
  return {
    id: response.id,
    siuntosKodas: response.siuntos_kodas,
    busena: response.busena,
    dydis: response.dydis,
    siuntimoAdresas: response.siuntimo_adresas,
    gavimoAdresas: response.gavimo_adresas,
    data: response.data,
    createdAt: response.created_at,
    siuntejas: response.siuntejas,
    gavejas: response.gavejas,
  };
}

function toShipment(response: ShipmentResponse): Shipment {
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

function toPayload(payload: ShipmentCreatePayload | ShipmentUpdatePayload) {
  return {
    ...(payload.siuntejas
      ? {
          siuntejas: {
            vardas: payload.siuntejas.vardas,
            pavarde: payload.siuntejas.pavarde,
            telefono_nr: payload.siuntejas.telefonoNr,
            el_pastas: payload.siuntejas.elPastas,
          },
        }
      : {}),
    ...(payload.gavejas
      ? {
          gavejas: {
            vardas: payload.gavejas.vardas,
            pavarde: payload.gavejas.pavarde,
            telefono_nr: payload.gavejas.telefonoNr,
            el_pastas: payload.gavejas.elPastas,
          },
        }
      : {}),
    ...(payload.dydis ? { dydis: payload.dydis } : {}),
    ...(payload.gavimoAdresas ? { gavimo_adresas: payload.gavimoAdresas } : {}),
    ...(payload.siuntimoAdresas ? { siuntimo_adresas: payload.siuntimoAdresas } : {}),
    ...(payload.data ? { data: payload.data } : {}),
    ...(payload.apmokamasPastomate !== undefined
      ? { apmokamas_pastomate: payload.apmokamasPastomate }
      : {}),
    ...('busena' in payload && payload.busena ? { busena: payload.busena } : {}),
  };
}

export async function fetchShipments(filters: ShipmentFilters): Promise<ShipmentListItem[]> {
  const searchParams = new URLSearchParams();

  if (filters.siuntosKodas) {
    searchParams.set('siuntos_kodas', filters.siuntosKodas);
  }

  if (filters.busena) {
    searchParams.set('busena', filters.busena);
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
