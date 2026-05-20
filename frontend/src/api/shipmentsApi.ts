import { apiDelete, apiGet, apiPatch, apiPost, apiRequest } from './client';
import type {
  Shipment,
  ShipmentCreatePayload,
  ShipmentFilters,
  ShipmentListItem,
  ShipmentPaymentAction,
  ShipmentPaymentRequest,
  ShipmentPaymentResult,
  ShipmentRegistrationPreview,
  ShipmentRegistrationResult,
  ShipmentRegistrationSession,
  ShipmentUpdatePayload,
} from '../models/shipment';

type ApiShipmentStatus =
  | 'parengta'
  | 'apmoketa'
  | 'uzregistruota'
  | 'ideta'
  | 'tranzite'
  | 'pristatyta'
  | 'atsiimta'
  | 'atsaukta';

type ShipmentPartyResponse = {
  asmuo_id: number;
  vardas: string;
  pavarde: string;
  telefono_nr: string;
  el_pastas: string;
};

type ShipmentListItemResponse = {
  id: number;
  siuntos_kodas: string;
  busena: ApiShipmentStatus;
  dydis: Shipment['size'];
  siuntimo_adresas: string;
  gavimo_adresas: string;
  data: string;
  created_at: string;
  siuntejas: string;
  gavejas: string;
};

type ShipmentResponse = {
  id: number;
  uzsakymo_nr: number;
  siuntos_kodas: string;
  dydis: Shipment['size'];
  gavimo_adresas: string;
  siuntimo_adresas: string;
  data: string;
  busena: ApiShipmentStatus;
  suma: number | string;
  saskaita: string | null;
  apmokamas_pastomate: boolean;
  pastomato_skyrius_id: number | null;
  created_at: string;
  updated_at: string;
  siuntejas: ShipmentPartyResponse;
  gavejas: ShipmentPartyResponse;
};

type ApiShipmentCreatePayload = {
  siuntejas: {
    vardas: string;
    pavarde: string;
    telefono_nr: string;
    el_pastas: string;
  };
  gavejas: {
    vardas: string;
    pavarde: string;
    telefono_nr: string;
    el_pastas: string;
  };
  dydis: Shipment['size'];
  gavimo_adresas: string;
  siuntimo_adresas: string;
  data?: string;
  apmokamas_pastomate: boolean;
};

type RegistrationSessionResponse = {
  session_id: string;
};

type RegistrationPreviewResponse = {
  session_id: string;
  registration_data: ApiShipmentCreatePayload;
  amount: number | string;
};

type PaymentRequestResponse = {
  shipment_id: number;
  order_number: number;
  shipment_code: string;
  amount: number | string;
  invoice: string | null;
  pay_at_locker: boolean;
  status: 'pending' | 'paid_at_locker' | 'online_required';
};

type RegistrationResultResponse = {
  result: 'payment_required' | 'registered';
  shipment: ShipmentResponse;
  payment_request: PaymentRequestResponse | null;
  parcel_label: string | null;
  message: string;
};

type PaymentResultResponse = {
  result: 'confirmed' | 'canceled' | 'unsuccessful';
  shipment: ShipmentResponse;
  parcel_label: string | null;
  message: string;
};

const shipmentStatusFromApi: Record<ApiShipmentStatus, Shipment['status']> = {
  parengta: 'prepared',
  apmoketa: 'paid',
  uzregistruota: 'registered',
  ideta: 'inserted',
  tranzite: 'in_transit',
  pristatyta: 'delivered',
  atsiimta: 'collected',
  atsaukta: 'cancelled',
};

const shipmentStatusToApi: Record<Shipment['status'], ApiShipmentStatus> = {
  prepared: 'parengta',
  paid: 'apmoketa',
  registered: 'uzregistruota',
  inserted: 'ideta',
  in_transit: 'tranzite',
  delivered: 'pristatyta',
  collected: 'atsiimta',
  cancelled: 'atsaukta',
};

function toShipmentParty(party: ShipmentPartyResponse): Shipment['sender'] {
  return {
    personId: party.asmuo_id,
    firstName: party.vardas,
    lastName: party.pavarde,
    phoneNumber: party.telefono_nr,
    email: party.el_pastas,
  };
}

function toShipmentListItem(response: ShipmentListItemResponse): ShipmentListItem {
  return {
    id: response.id,
    shipmentCode: response.siuntos_kodas,
    status: shipmentStatusFromApi[response.busena],
    size: response.dydis,
    dispatchAddress: response.siuntimo_adresas,
    destinationAddress: response.gavimo_adresas,
    shipmentDate: response.data,
    createdAt: response.created_at,
    sender: response.siuntejas,
    receiver: response.gavejas,
  };
}

function toShipment(response: ShipmentResponse): Shipment {
  return {
    id: response.id,
    orderNumber: response.uzsakymo_nr,
    shipmentCode: response.siuntos_kodas,
    size: response.dydis,
    destinationAddress: response.gavimo_adresas,
    dispatchAddress: response.siuntimo_adresas,
    shipmentDate: response.data,
    status: shipmentStatusFromApi[response.busena],
    amount: Number(response.suma),
    invoice: response.saskaita,
    paymentAtLocker: response.apmokamas_pastomate,
    lockerCellId: response.pastomato_skyrius_id,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    sender: toShipmentParty(response.siuntejas),
    receiver: toShipmentParty(response.gavejas),
  };
}

function fromPayload(payload: ApiShipmentCreatePayload): ShipmentCreatePayload {
  return {
    sender: {
      firstName: payload.siuntejas.vardas,
      lastName: payload.siuntejas.pavarde,
      phoneNumber: payload.siuntejas.telefono_nr,
      email: payload.siuntejas.el_pastas,
    },
    receiver: {
      firstName: payload.gavejas.vardas,
      lastName: payload.gavejas.pavarde,
      phoneNumber: payload.gavejas.telefono_nr,
      email: payload.gavejas.el_pastas,
    },
    size: payload.dydis,
    destinationAddress: payload.gavimo_adresas,
    dispatchAddress: payload.siuntimo_adresas,
    shipmentDate: payload.data,
    paymentAtLocker: payload.apmokamas_pastomate,
  };
}

function toPaymentRequest(response: PaymentRequestResponse): ShipmentPaymentRequest {
  return {
    shipmentId: response.shipment_id,
    orderNumber: response.order_number,
    shipmentCode: response.shipment_code,
    amount: Number(response.amount),
    invoice: response.invoice,
    payAtLocker: response.pay_at_locker,
    status: response.status,
  };
}

function toRegistrationPreview(response: RegistrationPreviewResponse): ShipmentRegistrationPreview {
  return {
    sessionId: response.session_id,
    registrationData: fromPayload(response.registration_data),
    amount: Number(response.amount),
  };
}

function toRegistrationResult(response: RegistrationResultResponse): ShipmentRegistrationResult {
  return {
    result: response.result,
    shipment: toShipment(response.shipment),
    paymentRequest: response.payment_request ? toPaymentRequest(response.payment_request) : null,
    parcelLabel: response.parcel_label,
    message: response.message,
  };
}

function toPaymentResult(response: PaymentResultResponse): ShipmentPaymentResult {
  return {
    result: response.result,
    shipment: toShipment(response.shipment),
    parcelLabel: response.parcel_label,
    message: response.message,
  };
}

function toPayload(payload: ShipmentCreatePayload | ShipmentUpdatePayload) {
  return {
    ...(payload.sender
      ? {
          siuntejas: {
            vardas: payload.sender.firstName,
            pavarde: payload.sender.lastName,
            telefono_nr: payload.sender.phoneNumber,
            el_pastas: payload.sender.email,
          },
        }
      : {}),
    ...(payload.receiver
      ? {
          gavejas: {
            vardas: payload.receiver.firstName,
            pavarde: payload.receiver.lastName,
            telefono_nr: payload.receiver.phoneNumber,
            el_pastas: payload.receiver.email,
          },
        }
      : {}),
    ...(payload.size ? { dydis: payload.size } : {}),
    ...(payload.destinationAddress ? { gavimo_adresas: payload.destinationAddress } : {}),
    ...(payload.dispatchAddress ? { siuntimo_adresas: payload.dispatchAddress } : {}),
    ...(payload.shipmentDate ? { data: payload.shipmentDate } : {}),
    ...(payload.paymentAtLocker !== undefined
      ? { apmokamas_pastomate: payload.paymentAtLocker }
      : {}),
    ...('status' in payload && payload.status
      ? { busena: shipmentStatusToApi[payload.status] }
      : {}),
  };
}

function toCreatePayload(payload: ShipmentCreatePayload): ApiShipmentCreatePayload {
  return {
    siuntejas: {
      vardas: payload.sender.firstName,
      pavarde: payload.sender.lastName,
      telefono_nr: payload.sender.phoneNumber,
      el_pastas: payload.sender.email,
    },
    gavejas: {
      vardas: payload.receiver.firstName,
      pavarde: payload.receiver.lastName,
      telefono_nr: payload.receiver.phoneNumber,
      el_pastas: payload.receiver.email,
    },
    dydis: payload.size,
    gavimo_adresas: payload.destinationAddress,
    siuntimo_adresas: payload.dispatchAddress,
    ...(payload.shipmentDate ? { data: payload.shipmentDate } : {}),
    apmokamas_pastomate: payload.paymentAtLocker,
  };
}

function toPaymentActionPayload(action: ShipmentPaymentAction) {
  if (action.cancelPayment) {
    return { cancel_payment: true };
  }

  return {
    cancel_payment: false,
    payment_details: {
      card_holder: action.paymentDetails.cardHolder,
      card_number: action.paymentDetails.cardNumber,
      expiry_month: action.paymentDetails.expiryMonth,
      expiry_year: action.paymentDetails.expiryYear,
      cvv: action.paymentDetails.cvv,
    },
  };
}

export async function fetchShipments(filters: ShipmentFilters): Promise<ShipmentListItem[]> {
  const searchParams = new URLSearchParams();

  if (filters.shipmentCode) {
    searchParams.set('shipment_code', filters.shipmentCode);
  }

  if (filters.status) {
    searchParams.set('status', shipmentStatusToApi[filters.status]);
  }

  const query = searchParams.toString();
  const response = await apiGet<ShipmentListItemResponse[]>(
    `/api/shipments${query ? `?${query}` : ''}`,
  );

  return response.map(toShipmentListItem);
}

export async function fetchShipment(id: number): Promise<Shipment> {
  const response = await apiGet<ShipmentResponse>(`/api/shipments/${id}`);
  return toShipment(response);
}

export async function createShipment(payload: ShipmentCreatePayload): Promise<Shipment> {
  const response = await apiPost<ShipmentResponse, ReturnType<typeof toPayload>>(
    '/api/shipments',
    toPayload(payload),
  );
  return toShipment(response);
}

export async function updateShipment(id: number, payload: ShipmentUpdatePayload): Promise<Shipment> {
  const response = await apiPatch<ShipmentResponse, ReturnType<typeof toPayload>>(
    `/api/shipments/${id}`,
    toPayload(payload),
  );
  return toShipment(response);
}

export async function deleteShipment(id: number): Promise<void> {
  await apiDelete(`/api/shipments/${id}`);
}

export async function startShipmentRegistration(): Promise<ShipmentRegistrationSession> {
  const response = await apiRequest<RegistrationSessionResponse>(
    '/api/shipments/registration-sessions',
    { method: 'POST' },
  );
  return {
    sessionId: response.session_id,
  };
}

export async function validateShipmentRegistrationForm(
  sessionId: string,
  payload: ShipmentCreatePayload,
): Promise<ShipmentRegistrationPreview> {
  const response = await apiPost<RegistrationPreviewResponse, ApiShipmentCreatePayload>(
    `/api/shipments/registration-sessions/${sessionId}/validate-form`,
    toCreatePayload(payload),
  );
  return toRegistrationPreview(response);
}

export async function confirmShipmentRegistration(
  sessionId: string,
  payload: ShipmentCreatePayload,
): Promise<ShipmentRegistrationResult> {
  const response = await apiPost<RegistrationResultResponse, ApiShipmentCreatePayload>(
    `/api/shipments/registration-sessions/${sessionId}/confirm`,
    toCreatePayload(payload),
  );
  return toRegistrationResult(response);
}

export async function requestShipmentPaymentDetails(
  sessionId: string,
): Promise<ShipmentPaymentRequest> {
  const response = await apiGet<PaymentRequestResponse>(
    `/api/payments/registration-sessions/${sessionId}/details`,
  );
  return toPaymentRequest(response);
}

export async function sendShipmentPaymentDetails(
  sessionId: string,
  action: ShipmentPaymentAction,
): Promise<ShipmentPaymentResult> {
  const response = await apiPost<PaymentResultResponse, ReturnType<typeof toPaymentActionPayload>>(
    `/api/payments/registration-sessions/${sessionId}/details`,
    toPaymentActionPayload(action),
  );
  return toPaymentResult(response);
}

export async function cancelShipmentRegistrationSession(sessionId: string): Promise<void> {
  await apiDelete(`/api/payments/registration-sessions/${sessionId}`);
}
