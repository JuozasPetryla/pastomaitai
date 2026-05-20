import { apiGet, apiRequest } from './client';
import { toShipment, type ShipmentResponse } from './shipmentsApi';
import type { Shipment } from '../models/shipment';
import type { DemoLockerCell, DemoLockerState, LockerStatus } from '../models/locker';

// ── Raw API types ────────────────────────────────────────────────────────────

type CourierLockerListItemResponse = {
  id: number;
  produkto_kodas: string;
  adresas: string;
  busena: 'aktyvus' | 'neaktyvus' | 'negali_spausdinti' | 'panaikintas';
  laukia_iskrovimo: number;
  laukia_pakrovimo: number;
};

type LockerCellResponse = {
  id: number;
  numeris: number;
  dydis: 's' | 'm' | 'l';
  uzimtas: boolean;
  dureles_atidarytos: boolean;
  siuntos_kodas: string | null;
  siuntos_busena: string | null;
};

type LockerSessionResponse = {
  veiksmas: 'atsiemimas' | 'iskrovimas' | 'pakrovimas';
  siuntos_id: number;
  siuntos_kodas: string;
  skyriaus_id: number;
  skyriaus_numeris: number;
  dureles_atidarytos: boolean;
};

type LockerStateResponse = {
  id: number;
  produkto_kodas: string;
  adresas: string;
  busena: 'aktyvus' | 'neaktyvus' | 'negali_spausdinti' | 'panaikintas';
  created_at: string;
  updated_at: string;
  skyriai: LockerCellResponse[];
  aktyvi_sesija: LockerSessionResponse | null;
};

type LockerContentsResponse = {
  locker: LockerStateResponse;
  siuntos_iskrovimui: ShipmentResponse[];
  siuntos_pakrovimui: ShipmentResponse[];
};

type LockerActionResponse = {
  zinute: string;
  locker: LockerStateResponse;
  siunta: ShipmentResponse | null;
};

// ── Frontend model types ─────────────────────────────────────────────────────

export type CourierLockerListItem = {
  id: number;
  productCode: string;
  address: string;
  status: LockerStatus;
  pendingTakeout: number;
  pendingInsert: number;
};

export type CourierLockerContents = {
  locker: DemoLockerState;
  shipmentsForTakeout: Shipment[];
  shipmentsForInsert: Shipment[];
};

export type CourierLockerActionResult = {
  message: string;
  locker: DemoLockerState;
  shipment: Shipment | null;
};

// ── Mapping helpers ──────────────────────────────────────────────────────────

const lockerStatusFromApi: Record<LockerStateResponse['busena'], LockerStatus> = {
  aktyvus: 'active',
  neaktyvus: 'inactive',
  negali_spausdinti: 'printing_disabled',
  panaikintas: 'deleted',
};

function toCell(cell: LockerCellResponse): DemoLockerCell {
  return {
    id: cell.id,
    number: cell.numeris,
    size: cell.dydis,
    occupied: cell.uzimtas,
    doorOpen: cell.dureles_atidarytos,
    shipmentCode: cell.siuntos_kodas,
    shipmentStatus: cell.siuntos_busena,
  };
}

function toLockerState(r: LockerStateResponse): DemoLockerState {
  return {
    id: r.id,
    productCode: r.produkto_kodas,
    address: r.adresas,
    status: lockerStatusFromApi[r.busena],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    cells: r.skyriai.map(toCell),
    activeSession: r.aktyvi_sesija
      ? {
          action: r.aktyvi_sesija.veiksmas,
          shipmentId: r.aktyvi_sesija.siuntos_id,
          shipmentCode: r.aktyvi_sesija.siuntos_kodas,
          cellId: r.aktyvi_sesija.skyriaus_id,
          cellNumber: r.aktyvi_sesija.skyriaus_numeris,
          doorOpen: r.aktyvi_sesija.dureles_atidarytos,
        }
      : null,
  };
}

function toActionResult(r: LockerActionResponse): CourierLockerActionResult {
  return {
    message: r.zinute,
    locker: toLockerState(r.locker),
    shipment: r.siunta ? toShipment(r.siunta) : null,
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchCourierLockers(): Promise<CourierLockerListItem[]> {
  const response = await apiGet<CourierLockerListItemResponse[]>('/api/lockers/courier');
  return response.map((r) => ({
    id: r.id,
    productCode: r.produkto_kodas,
    address: r.adresas,
    status: lockerStatusFromApi[r.busena],
    pendingTakeout: r.laukia_iskrovimo,
    pendingInsert: r.laukia_pakrovimo,
  }));
}

export async function fetchLockerContents(lockerId: number): Promise<CourierLockerContents> {
  const response = await apiGet<LockerContentsResponse>(`/api/lockers/${lockerId}/contents`);
  return {
    locker: toLockerState(response.locker),
    shipmentsForTakeout: response.siuntos_iskrovimui.map(toShipment),
    shipmentsForInsert: response.siuntos_pakrovimui.map(toShipment),
  };
}

export async function courierOpenTakeout(
  lockerId: number,
  shipmentCode: string,
): Promise<CourierLockerActionResult> {
  const response = await apiRequest<LockerActionResponse>(`/api/lockers/${lockerId}/takeout/open`, {
    method: 'POST',
    body: { siuntos_kodas: shipmentCode },
  });
  return toActionResult(response);
}

export async function courierCloseTakeout(lockerId: number): Promise<CourierLockerActionResult> {
  const response = await apiRequest<LockerActionResponse>(`/api/lockers/${lockerId}/takeout/close`, {
    method: 'POST',
  });
  return toActionResult(response);
}

export async function courierOpenInsert(
  lockerId: number,
  shipmentCode: string,
): Promise<CourierLockerActionResult> {
  const response = await apiRequest<LockerActionResponse>(`/api/lockers/${lockerId}/insert/open`, {
    method: 'POST',
    body: { siuntos_kodas: shipmentCode },
  });
  return toActionResult(response);
}

export async function courierCloseInsert(lockerId: number): Promise<CourierLockerActionResult> {
  const response = await apiRequest<LockerActionResponse>(`/api/lockers/${lockerId}/insert/close`, {
    method: 'POST',
  });
  return toActionResult(response);
}