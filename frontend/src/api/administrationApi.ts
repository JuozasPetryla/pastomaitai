import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type {
  Locker,
  LockerCreatePayload,
  LockerListItem,
  LockerUpdatePayload,
  LockerStatus,
  LockerCellSize,
} from '../models/pastomatas';

type ApiLockerStatus = 'aktyvus' | 'neaktyvus' | 'negali_spausdinti' | 'panaikintas';

type LockerListItemResponse = {
  id: number;
  adresas: string;
  busena: ApiLockerStatus;
  produkto_kodas: string;
  skyriu_skaicius: number;
};

type LockerCellResponse = {
  id: number;
  dydis: LockerCellSize;
  numeris: number;
};

type LockerResponse = LockerListItemResponse & {
  created_at: string;
  updated_at: string;
  skyriai: LockerCellResponse[];
};

const lockerStatusFromApi: Record<ApiLockerStatus, LockerStatus> = {
  aktyvus: 'active',
  neaktyvus: 'inactive',
  negali_spausdinti: 'printing_disabled',
  panaikintas: 'deleted',
};

const lockerStatusToApi: Record<LockerStatus, ApiLockerStatus> = {
  active: 'aktyvus',
  inactive: 'neaktyvus',
  printing_disabled: 'negali_spausdinti',
  deleted: 'panaikintas',
};

function toListItem(response: LockerListItemResponse): LockerListItem {
  return {
    id: response.id,
    address: response.adresas,
    status: lockerStatusFromApi[response.busena],
    productCode: response.produkto_kodas,
    cellCount: response.skyriu_skaicius,
  };
}

function toLocker(response: LockerResponse): Locker {
  return {
    ...toListItem(response),
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    cells: response.skyriai.map((cell) => ({
      id: cell.id,
      size: cell.dydis,
      number: cell.numeris,
    })),
  };
}

export async function fetchLockers(params: {
  region?: string;
  status?: LockerStatus;
}): Promise<LockerListItem[]> {
  const searchParams = new URLSearchParams();

  if (params.region) {
    searchParams.set('region', params.region);
  }

  if (params.status) {
    searchParams.set('status', lockerStatusToApi[params.status]);
  }

  const query = searchParams.toString();
  const response = await apiGet<LockerListItemResponse[]>(
    `/api/administration/lockers${query ? `?${query}` : ''}`,
  );

  return response.map(toListItem);
}

export async function fetchLocker(id: number): Promise<Locker> {
  const response = await apiGet<LockerResponse>(`/api/administration/lockers/${id}`);
  return toLocker(response);
}

export async function createLocker(payload: LockerCreatePayload): Promise<Locker> {
  const response = await apiPost<
    LockerResponse,
    {
      adresas: string;
      produkto_kodas: string;
      skyriai: Array<{ dydis: LockerCellSize; kiekis: number }>;
    }
  >('/api/administration/lockers', {
    adresas: payload.address,
    produkto_kodas: payload.productCode,
    skyriai: payload.cellGroups.map((group) => ({ dydis: group.size, kiekis: group.quantity })),
  });
  return toLocker(response);
}

export async function updateLocker(id: number, payload: LockerUpdatePayload): Promise<Locker> {
  const response = await apiPatch<
    LockerResponse,
    {
      adresas?: string;
      busena?: ApiLockerStatus;
      produkto_kodas?: string;
    }
  >(`/api/administration/lockers/${id}`, {
    ...(payload.address ? { adresas: payload.address } : {}),
    ...(payload.status ? { busena: lockerStatusToApi[payload.status] } : {}),
    ...(payload.productCode ? { produkto_kodas: payload.productCode } : {}),
  });
  return toLocker(response);
}

export async function deleteLocker(id: number): Promise<void> {
  await apiDelete(`/api/administration/lockers/${id}`);
}
