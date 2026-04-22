export type ShipmentStatus =
  | 'parengta'
  | 'apmoketa'
  | 'uzregistruota'
  | 'ideta'
  | 'tranzite'
  | 'pristatyta'
  | 'atsiimta'
  | 'atsaukta';

export type ShipmentSize = 's' | 'm' | 'l';

export type ShipmentParty = {
  asmuoId: number;
  vardas: string;
  pavarde: string;
  telefonoNr: string;
  elPastas: string;
};

export type ShipmentPartyInput = Omit<ShipmentParty, 'asmuoId'>;

export type ShipmentListItem = {
  id: number;
  siuntosKodas: string;
  busena: ShipmentStatus;
  dydis: ShipmentSize;
  siuntimoAdresas: string;
  gavimoAdresas: string;
  data: string;
  createdAt: string;
  siuntejas: string;
  gavejas: string;
};

export type Shipment = {
  id: number;
  uzsakymoNr: number;
  siuntosKodas: string;
  dydis: ShipmentSize;
  gavimoAdresas: string;
  siuntimoAdresas: string;
  data: string;
  busena: ShipmentStatus;
  suma: number;
  saskaita: string | null;
  apmokamasPastomate: boolean;
  pastomatoSkyriausId: number | null;
  createdAt: string;
  updatedAt: string;
  siuntejas: ShipmentParty;
  gavejas: ShipmentParty;
};

export type ShipmentFilters = {
  siuntosKodas: string;
  busena: ShipmentStatus | '';
};

export type ShipmentCreatePayload = {
  siuntejas: ShipmentPartyInput;
  gavejas: ShipmentPartyInput;
  dydis: ShipmentSize;
  gavimoAdresas: string;
  siuntimoAdresas: string;
  data?: string;
  apmokamasPastomate: boolean;
};

export type ShipmentUpdatePayload = Partial<ShipmentCreatePayload> & {
  busena?: ShipmentStatus;
};
