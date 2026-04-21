import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type {
  Pranesimas,
  PranesimasCreatePayload,
  PranesimasListItem,
  PranesimasUpdatePayload,
  PranesimoTipas,
} from '../models/pranesimas';

type PranesimasListItemResponse = {
  id: number;
  asmuo_id: number;
  tipas: PranesimoTipas;
  issiustas: boolean;
  issiuntimo_operatoriui_data: string | null;
  created_at: string;
};

type PranesimasResponse = PranesimasListItemResponse & {
  tekstas: string;
  operatoriaus_atsako_data: string | null;
};

function toListItem(response: PranesimasListItemResponse): PranesimasListItem {
  return {
    id: response.id,
    asmuo_id: response.asmuo_id,
    tipas: response.tipas,
    issiustas: response.issiustas,
    issiuntimo_operatoriui_data: response.issiuntimo_operatoriui_data,
    created_at: response.created_at,
  };
}

function toPranesimas(response: PranesimasResponse): Pranesimas {
  return {
    ...toListItem(response),
    tekstas: response.tekstas,
    operatoriaus_atsako_data: response.operatoriaus_atsako_data,
  };
}

export async function fetchPranesimai(params: {
  asmuo_id?: number;
  tipas?: PranesimoTipas;
  issiustas?: boolean;
}): Promise<PranesimasListItem[]> {
  const searchParams = new URLSearchParams();

  if (params.asmuo_id !== undefined) {
    searchParams.set('asmuo_id', String(params.asmuo_id));
  }

  if (params.tipas) {
    searchParams.set('tipas', params.tipas);
  }

  if (params.issiustas !== undefined) {
    searchParams.set('issiustas', String(params.issiustas));
  }

  const query = searchParams.toString();
  const response = await apiGet<PranesimasListItemResponse[]>(
    `/api/notifications/pranesimai${query ? `?${query}` : ''}`,
  );

  return response.map(toListItem);
}

export async function fetchPranesimas(id: number): Promise<Pranesimas> {
  const response = await apiGet<PranesimasResponse>(`/api/notifications/pranesimai/${id}`);
  return toPranesimas(response);
}

export async function createPranesimas(payload: PranesimasCreatePayload): Promise<Pranesimas> {
  const response = await apiPost<PranesimasResponse, PranesimasCreatePayload>(
    '/api/notifications/pranesimai',
    payload,
  );
  return toPranesimas(response);
}

export async function updatePranesimas(
  id: number,
  payload: PranesimasUpdatePayload,
): Promise<Pranesimas> {
  const response = await apiPatch<PranesimasResponse, PranesimasUpdatePayload>(
    `/api/notifications/pranesimai/${id}`,
    payload,
  );
  return toPranesimas(response);
}

export async function deletePranesimas(id: number): Promise<void> {
  await apiDelete(`/api/notifications/pranesimai/${id}`);
}