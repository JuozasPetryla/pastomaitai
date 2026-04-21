import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type {
  Pastomatas,
  PastomatasCreatePayload,
  PastomatasListItem,
  PastomatasUpdatePayload,
  PastomatoBusena,
  SiuntosDydis,
} from '../models/pastomatas';

type PastomatasListItemResponse = {
  id: number;
  adresas: string;
  busena: PastomatoBusena;
  produkto_kodas: string;
  skyriu_skaicius: number;
};

type PastomatoSkyriusResponse = {
  id: number;
  dydis: SiuntosDydis;
  numeris: number;
};

type PastomatasResponse = PastomatasListItemResponse & {
  created_at: string;
  updated_at: string;
  skyriai: PastomatoSkyriusResponse[];
};

function toListItem(response: PastomatasListItemResponse): PastomatasListItem {
  return {
    id: response.id,
    adresas: response.adresas,
    busena: response.busena,
    produktoKodas: response.produkto_kodas,
    skyriuSkaicius: response.skyriu_skaicius,
  };
}

function toPastomatas(response: PastomatasResponse): Pastomatas {
  return {
    ...toListItem(response),
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    skyriai: response.skyriai,
  };
}

export async function fetchPastomatai(params: {
  regionas?: string;
  busena?: PastomatoBusena;
}): Promise<PastomatasListItem[]> {
  const searchParams = new URLSearchParams();

  if (params.regionas) {
    searchParams.set('regionas', params.regionas);
  }

  if (params.busena) {
    searchParams.set('busena', params.busena);
  }

  const query = searchParams.toString();
  const response = await apiGet<PastomatasListItemResponse[]>(
    `/api/administration/pastomatai${query ? `?${query}` : ''}`,
  );

  return response.map(toListItem);
}

export async function fetchPastomatas(id: number): Promise<Pastomatas> {
  const response = await apiGet<PastomatasResponse>(`/api/administration/pastomatai/${id}`);
  return toPastomatas(response);
}

export async function createPastomatas(payload: PastomatasCreatePayload): Promise<Pastomatas> {
  const response = await apiPost<PastomatasResponse, PastomatasCreatePayload>(
    '/api/administration/pastomatai',
    payload,
  );
  return toPastomatas(response);
}

export async function updatePastomatas(
  id: number,
  payload: PastomatasUpdatePayload,
): Promise<Pastomatas> {
  const response = await apiPatch<PastomatasResponse, PastomatasUpdatePayload>(
    `/api/administration/pastomatai/${id}`,
    payload,
  );
  return toPastomatas(response);
}

export async function deletePastomatas(id: number): Promise<void> {
  await apiDelete(`/api/administration/pastomatai/${id}`);
}
