export type ShipmentStatus =
  | 'prepared'
  | 'paid'
  | 'registered'
  | 'inserted'
  | 'in_transit'
  | 'delivered'
  | 'collected'
  | 'cancelled';

export type ShipmentSize = 's' | 'm' | 'l';

export type ShipmentParty = {
  personId: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
};

export type ShipmentPartyInput = Omit<ShipmentParty, 'personId'>;

export type ShipmentListItem = {
  id: number;
  shipmentCode: string;
  status: ShipmentStatus;
  size: ShipmentSize;
  dispatchAddress: string;
  destinationAddress: string;
  shipmentDate: string;
  createdAt: string;
  sender: string;
  receiver: string;
};

export type Shipment = {
  id: number;
  orderNumber: number;
  shipmentCode: string;
  size: ShipmentSize;
  destinationAddress: string;
  dispatchAddress: string;
  shipmentDate: string;
  status: ShipmentStatus;
  amount: number;
  invoice: string | null;
  paymentAtLocker: boolean;
  lockerCellId: number | null;
  createdAt: string;
  updatedAt: string;
  sender: ShipmentParty;
  receiver: ShipmentParty;
};

export type ShipmentFilters = {
  shipmentCode: string;
  status: ShipmentStatus | '';
};

export type ShipmentCreatePayload = {
  sender: ShipmentPartyInput;
  receiver: ShipmentPartyInput;
  size: ShipmentSize;
  destinationAddress: string;
  dispatchAddress: string;
  shipmentDate?: string;
  paymentAtLocker: boolean;
};

export type ShipmentUpdatePayload = Partial<ShipmentCreatePayload> & {
  status?: ShipmentStatus;
};
