import { apiGet, apiRequest } from './client';
import { toShipment, type ShipmentResponse } from './shipmentsApi';
import type { LockerActionResult, LockerRegistration, LockerState } from '../models/locker';

type LockerCellResponse = {
  id: number;
  numeris: number;
  dydis: 's' | 'm' | 'l';
  uzimtas: boolean;
  dureles_atidarytos: boolean;
  siuntos_kodas: string | null;
  siuntos_busena: ShipmentResponse['busena'] | null;
};

type LockerSessionResponse = {
  veiksmas: 'idejimas' | 'atsiemimas';
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
  busena: string;
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

function toLockerState(response: LockerStateResponse): LockerState {
  return {
    id: response.id,
    produktoKodas: response.produkto_kodas,
    adresas: response.adresas,
    busena: response.busena,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    skyriai: response.skyriai.map((cell) => ({
      id: cell.id,
      numeris: cell.numeris,
      dydis: cell.dydis,
      uzimtas: cell.uzimtas,
      durelesAtidarytos: cell.dureles_atidarytos,
      siuntosKodas: cell.siuntos_kodas,
      siuntosBusena: cell.siuntos_busena,
    })),
    aktyviSesija: response.aktyvi_sesija
      ? {
          veiksmas: response.aktyvi_sesija.veiksmas,
          siuntosId: response.aktyvi_sesija.siuntos_id,
          siuntosKodas: response.aktyvi_sesija.siuntos_kodas,
          skyriausId: response.aktyvi_sesija.skyriaus_id,
          skyriausNumeris: response.aktyvi_sesija.skyriaus_numeris,
          durelesAtidarytos: response.aktyvi_sesija.dureles_atidarytos,
        }
      : null,
  };
}

function toLockerActionResult(response: LockerActionResponse): LockerActionResult {
  return {
    zinute: response.zinute,
    locker: toLockerState(response.locker),
    siunta: response.siunta ? toShipment(response.siunta) : null,
  };
}

function toLockerRegistrationPayload(payload: LockerRegistration) {
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
    data: payload.data,
  };
}

export async function fetchDemoLockerState(): Promise<LockerState> {
  const state = await apiGet<LockerStateResponse>('/api/lockers/demo');
  return toLockerState(state);
}

export async function registerAtLocker(payload: LockerRegistration): Promise<LockerActionResult> {
  const response = await apiRequest<LockerActionResponse>('/api/lockers/demo/register', {
    method: 'POST',
    body: toLockerRegistrationPayload(payload),
  });
  return toLockerActionResult(response);
}

export async function payAtLocker(shipmentCode: string): Promise<LockerActionResult> {
  const response = await apiRequest<LockerActionResponse>('/api/lockers/demo/pay', {
    method: 'POST',
    body: { siuntos_kodas: shipmentCode },
  });
  return toLockerActionResult(response);
}

export async function openSendLocker(
  shipmentCode: string,
  lockerCellId: number,
): Promise<LockerActionResult> {
  const response = await apiRequest<LockerActionResponse>('/api/lockers/demo/send/open', {
    method: 'POST',
    body: { siuntos_kodas: shipmentCode, skyriaus_id: lockerCellId },
  });
  return toLockerActionResult(response);
}

export async function deliverToPickupLocker(shipmentCode: string): Promise<LockerActionResult> {
  const response = await apiRequest<LockerActionResponse>('/api/lockers/demo/send/deliver', {
    method: 'POST',
    body: { siuntos_kodas: shipmentCode },
  });
  return toLockerActionResult(response);
}

export async function openPickupLocker(shipmentCode: string): Promise<LockerActionResult> {
  const response = await apiRequest<LockerActionResponse>('/api/lockers/demo/pickup/open', {
    method: 'POST',
    body: { siuntos_kodas: shipmentCode },
  });
  return toLockerActionResult(response);
}

export async function closeLockerDoors(): Promise<LockerActionResult> {
  const response = await apiRequest<LockerActionResponse>('/api/lockers/demo/close', {
    method: 'POST',
  });
  return toLockerActionResult(response);
}
