import { apiGet, apiRequest } from './client';
import { toShipment, type ShipmentResponse } from './shipmentsApi';
import type { DemoLockerState, LockerStatus } from '../models/locker';
import type { Shipment } from '../models/shipment';

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
  veiksmas: 'atsiemimas';
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

type LockerActionResponse = {
  zinute: string;
  locker: LockerStateResponse;
  siunta: ShipmentResponse | null;
};

export type LockerPickupResult = {
  message: string;
  locker: DemoLockerState;
  shipment: Shipment | null;
};

const lockerStatusFromApi: Record<LockerStateResponse['busena'], LockerStatus> = {
  aktyvus: 'active',
  neaktyvus: 'inactive',
  negali_spausdinti: 'printing_disabled',
  panaikintas: 'deleted',
};

function toLockerState(response: LockerStateResponse): DemoLockerState {
  return {
    id: response.id,
    productCode: response.produkto_kodas,
    address: response.adresas,
    status: lockerStatusFromApi[response.busena],
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    cells: response.skyriai.map((cell) => ({
      id: cell.id,
      number: cell.numeris,
      size: cell.dydis,
      occupied: cell.uzimtas,
      doorOpen: cell.dureles_atidarytos,
      shipmentCode: cell.siuntos_kodas,
      shipmentStatus: cell.siuntos_busena,
    })),
    activeSession: response.aktyvi_sesija
      ? {
          action: response.aktyvi_sesija.veiksmas,
          shipmentId: response.aktyvi_sesija.siuntos_id,
          shipmentCode: response.aktyvi_sesija.siuntos_kodas,
          cellId: response.aktyvi_sesija.skyriaus_id,
          cellNumber: response.aktyvi_sesija.skyriaus_numeris,
          doorOpen: response.aktyvi_sesija.dureles_atidarytos,
        }
      : null,
  };
}

function toLockerPickupResult(response: LockerActionResponse): LockerPickupResult {
  return {
    message: response.zinute,
    locker: toLockerState(response.locker),
    shipment: response.siunta ? toShipment(response.siunta) : null,
  };
}

export async function fetchDemoLockerState(): Promise<DemoLockerState> {
  const response = await apiGet<LockerStateResponse>('/api/lockers/demo');
  return toLockerState(response);
}

export async function openPickupLocker(shipmentCode: string): Promise<LockerPickupResult> {
  const response = await apiRequest<LockerActionResponse>('/api/lockers/demo/pickup/open', {
    method: 'POST',
    body: { siuntos_kodas: shipmentCode },
  });
  return toLockerPickupResult(response);
}

export async function closeLockerDoors(): Promise<LockerPickupResult> {
  const response = await apiRequest<LockerActionResponse>('/api/lockers/demo/close', {
    method: 'POST',
  });
  return toLockerPickupResult(response);
}
