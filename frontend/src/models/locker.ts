export type LockerStatus = 'active' | 'inactive' | 'printing_disabled' | 'deleted';
export type LockerCellSize = 's' | 'm' | 'l';

export type LockerListItem = {
  id: number;
  address: string;
  status: LockerStatus;
  productCode: string;
  cellCount: number;
};

export type LockerCell = {
  id: number;
  size: LockerCellSize;
  number: number;
};

export type Locker = LockerListItem & {
  createdAt: string;
  updatedAt: string;
  cells: LockerCell[];
};

export type LockerFilters = {
  region: string;
  status: LockerStatus | '';
};

export type LockerCreatePayload = {
  address: string;
  productCode: string;
  cellGroups: Array<{
    size: LockerCellSize;
    quantity: number;
  }>;
};

export type LockerUpdatePayload = {
  address?: string;
  status?: LockerStatus;
  productCode?: string;
};
