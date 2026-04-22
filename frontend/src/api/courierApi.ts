import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type {
  Courier,
  CourierCreatePayload,
  CourierFilters,
  CourierListItem,
  CourierUpdatePayload,
} from '../models/courier';

type CourierListItemResponse = {
  id: number;
  telefono_nr: string;
  el_pastas: string;
  vardas: string;
  pavarde: string;
  pareigos: CourierListItem['pareigos'];
};

type CourierResponse = CourierListItemResponse & {
  created_at: string;
  updated_at: string;
};

function toListItem(response: CourierListItemResponse): CourierListItem {
  return {
    id: response.id,
    telefonoNr: response.telefono_nr,
    elPastas: response.el_pastas,
    vardas: response.vardas,
    pavarde: response.pavarde,
    pareigos: response.pareigos,
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

  if (filters.pareigos) {
    searchParams.set('pareigos', filters.pareigos);
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
  const response = await apiPost<CourierResponse, CourierCreatePayload>('/api/courier', payload);
  return toCourier(response);
}

export async function updateCourier(id: number, payload: CourierUpdatePayload): Promise<Courier> {
  const response = await apiPatch<CourierResponse, CourierUpdatePayload>(
    `/api/courier/${id}`,
    payload,
  );
  return toCourier(response);
}

export async function deleteCourier(id: number): Promise<void> {
  await apiDelete(`/api/courier/${id}`);
}
