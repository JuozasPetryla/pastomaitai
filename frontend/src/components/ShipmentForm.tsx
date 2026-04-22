import { useEffect, useState } from 'react';

import type {
  Shipment,
  ShipmentCreatePayload,
  ShipmentPartyInput,
  ShipmentStatus,
  ShipmentUpdatePayload,
} from '../models/shipment';

type ShipmentFormMode = 'create' | 'edit';

type ShipmentFormProps = {
  mode: ShipmentFormMode;
  shipment?: Shipment;
  onCancel: () => void;
  onCreate: (payload: ShipmentCreatePayload) => Promise<void>;
  onUpdate: (payload: ShipmentUpdatePayload) => Promise<void>;
  onError: (message: string) => void;
};

type FormState = {
  sender: ShipmentPartyInput;
  receiver: ShipmentPartyInput;
  size: Shipment['size'];
  dispatchAddress: string;
  destinationAddress: string;
  shipmentDate: string;
  paymentAtLocker: boolean;
  status: ShipmentStatus;
};

const statuses: ShipmentStatus[] = [
  'prepared',
  'paid',
  'registered',
  'inserted',
  'in_transit',
  'delivered',
  'collected',
  'cancelled',
];

function emptyParty(): ShipmentPartyInput {
  return {
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
  };
}

function todayValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function getInitialState(shipment?: Shipment): FormState {
  return {
    sender: shipment
      ? {
          firstName: shipment.sender.firstName,
          lastName: shipment.sender.lastName,
          phoneNumber: shipment.sender.phoneNumber,
          email: shipment.sender.email,
        }
      : emptyParty(),
    receiver: shipment
      ? {
          firstName: shipment.receiver.firstName,
          lastName: shipment.receiver.lastName,
          phoneNumber: shipment.receiver.phoneNumber,
          email: shipment.receiver.email,
        }
      : emptyParty(),
    size: shipment?.size ?? 'm',
    dispatchAddress: shipment?.dispatchAddress ?? '',
    destinationAddress: shipment?.destinationAddress ?? '',
    shipmentDate: shipment?.shipmentDate ?? todayValue(),
    paymentAtLocker: shipment?.paymentAtLocker ?? false,
    status: shipment?.status ?? 'registered',
  };
}

export function ShipmentForm({
  mode,
  shipment,
  onCancel,
  onCreate,
  onUpdate,
  onError,
}: ShipmentFormProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState(shipment));

  useEffect(() => {
    setForm(getInitialState(shipment));
  }, [shipment, mode]);

  const setPartyField = (
    side: 'sender' | 'receiver',
    field: keyof ShipmentPartyInput,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [side]: {
        ...current[side],
        [field]: value,
      },
    }));
  };

  const submit = async () => {
    if (form.dispatchAddress.trim().length < 3 || form.destinationAddress.trim().length < 3) {
      onError('Check the dispatch and destination addresses.');
      return;
    }

    const commonPayload = {
      sender: form.sender,
      receiver: form.receiver,
      size: form.size,
      dispatchAddress: form.dispatchAddress.trim(),
      destinationAddress: form.destinationAddress.trim(),
      shipmentDate: form.shipmentDate,
      paymentAtLocker: form.paymentAtLocker,
    };

    if (mode === 'create') {
      await onCreate(commonPayload);
      return;
    }

    await onUpdate({
      ...commonPayload,
      status: form.status,
    });
  };

  return (
    <section className="locker-form" aria-label="Shipment form">
      <header>
        <h3>{mode === 'create' ? 'Create shipment' : 'Edit shipment'}</h3>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </header>

      <div className="form-grid">
        <label>
          <span>Sender first name</span>
          <input
            value={form.sender.firstName}
            onChange={(event) => setPartyField('sender', 'firstName', event.target.value)}
          />
        </label>
        <label>
          <span>Sender last name</span>
          <input
            value={form.sender.lastName}
            onChange={(event) => setPartyField('sender', 'lastName', event.target.value)}
          />
        </label>
        <label>
          <span>Sender phone</span>
          <input
            value={form.sender.phoneNumber}
            onChange={(event) => setPartyField('sender', 'phoneNumber', event.target.value)}
          />
        </label>
        <label>
          <span>Sender email</span>
          <input
            type="email"
            value={form.sender.email}
            onChange={(event) => setPartyField('sender', 'email', event.target.value)}
          />
        </label>
        <label>
          <span>Receiver first name</span>
          <input
            value={form.receiver.firstName}
            onChange={(event) => setPartyField('receiver', 'firstName', event.target.value)}
          />
        </label>
        <label>
          <span>Receiver last name</span>
          <input
            value={form.receiver.lastName}
            onChange={(event) => setPartyField('receiver', 'lastName', event.target.value)}
          />
        </label>
        <label>
          <span>Receiver phone</span>
          <input
            value={form.receiver.phoneNumber}
            onChange={(event) => setPartyField('receiver', 'phoneNumber', event.target.value)}
          />
        </label>
        <label>
          <span>Receiver email</span>
          <input
            type="email"
            value={form.receiver.email}
            onChange={(event) => setPartyField('receiver', 'email', event.target.value)}
          />
        </label>
        <label>
          <span>Dispatch address</span>
          <input
            value={form.dispatchAddress}
            onChange={(event) => setForm({ ...form, dispatchAddress: event.target.value })}
          />
        </label>
        <label>
          <span>Destination address</span>
          <input
            value={form.destinationAddress}
            onChange={(event) => setForm({ ...form, destinationAddress: event.target.value })}
          />
        </label>
        <label>
          <span>Size</span>
          <select
            value={form.size}
            onChange={(event) => setForm({ ...form, size: event.target.value as Shipment['size'] })}
          >
            <option value="s">S</option>
            <option value="m">M</option>
            <option value="l">L</option>
          </select>
        </label>
        <label>
          <span>Shipment date</span>
          <input
            type="date"
            value={form.shipmentDate}
            onChange={(event) => setForm({ ...form, shipmentDate: event.target.value })}
          />
        </label>

        {mode === 'edit' ? (
          <label>
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as ShipmentStatus })}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="checkbox-label">
          <span>Payment at locker</span>
          <input
            type="checkbox"
            checked={form.paymentAtLocker}
            onChange={(event) => setForm({ ...form, paymentAtLocker: event.target.checked })}
          />
        </label>
      </div>

      <div className="form-actions">
        <button type="button" onClick={() => void submit()}>
          {mode === 'create' ? 'Create' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
