export type PastomatoBusena = 'aktyvus' | 'neaktyvus' | 'negali_spausdinti' | 'panaikintas';
export type SiuntosDydis = 's' | 'm' | 'l';

export type PastomatasListItem = {
  id: number;
  adresas: string;
  busena: PastomatoBusena;
  produktoKodas: string;
  skyriuSkaicius: number;
};

export type PastomatoSkyrius = {
  id: number;
  dydis: SiuntosDydis;
  numeris: number;
};

export type Pastomatas = PastomatasListItem & {
  createdAt: string;
  updatedAt: string;
  skyriai: PastomatoSkyrius[];
};

export type PastomatuFiltrai = {
  regionas: string;
  busena: PastomatoBusena | '';
};

export type PastomatasCreatePayload = {
  adresas: string;
  produkto_kodas: string;
  skyriai: Array<{
    dydis: SiuntosDydis;
    kiekis: number;
  }>;
};

export type PastomatasUpdatePayload = {
  adresas?: string;
  busena?: PastomatoBusena;
  produkto_kodas?: string;
};
