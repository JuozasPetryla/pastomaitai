import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type {
  Courier,
  CourierCreatePayload,
  CourierFilters,
  CourierListItem,
  CourierUpdatePayload,
} from '../models/courier';

type ApiCourierRole = 'administratorius' | 'kurjeris';

type CourierListItemResponse = {
  id: number;
  telefono_nr: string;
  el_pastas: string;
  vardas: string;
  pavarde: string;
  pareigos: ApiCourierRole;
};

type CourierResponse = CourierListItemResponse & {
  created_at: string;
  updated_at: string;
};

const courierRoleFromApi: Record<ApiCourierRole, CourierListItem['role']> = {
  administratorius: 'administrator',
  kurjeris: 'courier',
};

const courierRoleToApi: Record<CourierListItem['role'], ApiCourierRole> = {
  administrator: 'administratorius',
  courier: 'kurjeris',
};

function toListItem(response: CourierListItemResponse): CourierListItem {
  return {
    id: response.id,
    phoneNumber: response.telefono_nr,
    email: response.el_pastas,
    firstName: response.vardas,
    lastName: response.pavarde,
    role: courierRoleFromApi[response.pareigos],
  };
}

function toCourier(response: CourierResponse): Courier {
  return {
    ...toListItem(response),
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
}

export async function fetchCouriers(filters: CourierFilters): Promise<CourierListItem[]> {
  const searchParams = new URLSearchParams();

  if (filters.role) {
    searchParams.set('role', courierRoleToApi[filters.role]);
  }

  const query = searchParams.toString();
  const response = await apiGet<CourierListItemResponse[]>(
    `/api/courier${query ? `?${query}` : ''}`,
  );

  return response.map(toListItem);
}

export async function fetchCourier(id: number): Promise<Courier> {
  const response = await apiGet<CourierResponse>(`/api/courier/${id}`);
  return toCourier(response);
}

export async function createCourier(payload: CourierCreatePayload): Promise<Courier> {
  const response = await apiPost<
    CourierResponse,
    {
      telefono_nr: string;
      el_pastas: string;
      vardas: string;
      pavarde: string;
      pareigos: ApiCourierRole;
    }
  >('/api/courier', {
    telefono_nr: payload.phoneNumber,
    el_pastas: payload.email,
    vardas: payload.firstName,
    pavarde: payload.lastName,
    pareigos: courierRoleToApi[payload.role],
  });
  return toCourier(response);
}

export async function updateCourier(id: number, payload: CourierUpdatePayload): Promise<Courier> {
  const response = await apiPatch<
    CourierResponse,
    {
      telefono_nr?: string;
      el_pastas?: string;
      vardas?: string;
      pavarde?: string;
      pareigos?: ApiCourierRole;
    }
  >(`/api/courier/${id}`, {
    ...(payload.phoneNumber ? { telefono_nr: payload.phoneNumber } : {}),
    ...(payload.email ? { el_pastas: payload.email } : {}),
    ...(payload.firstName ? { vardas: payload.firstName } : {}),
    ...(payload.lastName ? { pavarde: payload.lastName } : {}),
    ...(payload.role ? { pareigos: courierRoleToApi[payload.role] } : {}),
  });
  return toCourier(response);
}

export async function deleteCourier(id: number): Promise<void> {
  await apiDelete(`/api/courier/${id}`);
}
