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
export type PaymentMethod = 'internet' | 'pastomatas';

export type ShipmentParty = {
  asmuoId: number;
  vardas: string;
  pavarde: string;
  telefonoNr: string;
  elPastas: string;
};

export type ShipmentPartyInput = Omit<ShipmentParty, 'asmuoId'>;

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

export type ShipmentUpsert = {
  siuntejas: ShipmentPartyInput;
  gavejas: ShipmentPartyInput;
  dydis: ShipmentSize;
  gavimoAdresas: string;
  siuntimoAdresas: string;
  data?: string;
  apmokamasPastomate: boolean;
  pastomatoSkyriausId: number | null;
};
