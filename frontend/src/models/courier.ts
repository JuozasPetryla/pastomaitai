export type CourierRole = 'administratorius' | 'kurjeris';

export type CourierListItem = {
  id: number;
  telefonoNr: string;
  elPastas: string;
  vardas: string;
  pavarde: string;
  pareigos: CourierRole;
};

export type Courier = CourierListItem & {
  createdAt: string;
  updatedAt: string;
};

export type CourierFilters = {
  pareigos: CourierRole | '';
};

export type CourierCreatePayload = {
  telefono_nr: string;
  el_pastas: string;
  vardas: string;
  pavarde: string;
  pareigos: CourierRole;
};

export type CourierUpdatePayload = {
  telefono_nr?: string;
  el_pastas?: string;
  vardas?: string;
  pavarde?: string;
  pareigos?: CourierRole;
};
