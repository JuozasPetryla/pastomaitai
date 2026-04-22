export type CourierRole = 'administrator' | 'courier';

export type CourierListItem = {
  id: number;
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  role: CourierRole;
};

export type Courier = CourierListItem & {
  createdAt: string;
  updatedAt: string;
};

export type CourierFilters = {
  role: CourierRole | '';
};

export type CourierCreatePayload = {
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  role: CourierRole;
};

export type CourierUpdatePayload = {
  phoneNumber?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: CourierRole;
};
