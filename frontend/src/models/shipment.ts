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
  lockerCellId: number | null;
  createdAt: string;
  updatedAt: string;
  sender: ShipmentParty;
  receiver: ShipmentParty;
};

export type ShipmentCreatePayload = {
  sender: ShipmentPartyInput;
  receiver: ShipmentPartyInput;
  size: ShipmentSize;
  destinationAddress: string;
  dispatchAddress: string;
  shipmentDate?: string;
};

export type ShipmentRegistrationSession = {
  sessionId: string;
};

export type ShipmentRegistrationPreview = {
  sessionId: string;
  registrationData: ShipmentCreatePayload;
  amount: number;
};

export type ShipmentPaymentRequest = {
  shipmentId: number;
  orderNumber: number;
  shipmentCode: string;
  amount: number;
  invoice: string | null;
  status: 'pending' | 'online_required';
};

export type ShipmentRegistrationResult = {
  result: 'payment_required' | 'registered';
  shipment: Shipment;
  paymentRequest: ShipmentPaymentRequest | null;
  parcelLabel: string | null;
  message: string;
};

export type ShipmentPaymentDetails = {
  cardHolder: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
};

export type ShipmentPaymentAction =
  | {
      cancelPayment: true;
    }
  | {
      cancelPayment: false;
      paymentDetails: ShipmentPaymentDetails;
    };

export type ShipmentPaymentResult = {
  result: 'confirmed' | 'canceled' | 'unsuccessful';
  shipment: Shipment;
  parcelLabel: string | null;
  message: string;
};
