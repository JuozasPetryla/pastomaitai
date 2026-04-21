import type { Shipment, ShipmentPartyInput, ShipmentSize, ShipmentStatus } from './shipment';

export type LockerAction = 'idejimas' | 'atsiemimas';

export type LockerCell = {
  id: number;
  numeris: number;
  dydis: ShipmentSize;
  uzimtas: boolean;
  durelesAtidarytos: boolean;
  siuntosKodas: string | null;
  siuntosBusena: ShipmentStatus | null;
};

export type LockerSession = {
  veiksmas: LockerAction;
  siuntosId: number;
  siuntosKodas: string;
  skyriausId: number;
  skyriausNumeris: number;
  durelesAtidarytos: boolean;
};

export type LockerState = {
  id: number;
  produktoKodas: string;
  adresas: string;
  busena: string;
  createdAt: string;
  updatedAt: string;
  skyriai: LockerCell[];
  aktyviSesija: LockerSession | null;
};

export type LockerAddressOption = {
  id: string;
  adresas: string;
  produktoKodas: string;
  yraDemo?: boolean;
};

export type LockerRegistration = {
  siuntejas: ShipmentPartyInput;
  gavejas: ShipmentPartyInput;
  dydis: ShipmentSize;
  gavimoAdresas: string;
  siuntimoAdresas: string;
  data?: string;
};

export type LockerActionResult = {
  zinute: string;
  locker: LockerState;
  siunta: Shipment | null;
};
