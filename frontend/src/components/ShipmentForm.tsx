import { useEffect, useRef, useState } from 'react';

import {
  cancelShipmentRegistrationSession,
  confirmShipmentRegistration,
  requestShipmentPaymentDetails,
  sendShipmentPaymentDetails,
  startShipmentRegistration,
  validateShipmentRegistrationForm,
} from '../api/shipmentsApi';
import type {
  Shipment,
  ShipmentCreatePayload,
  ShipmentPaymentDetails,
  ShipmentPaymentRequest,
  ShipmentRegistrationPreview,
  ShipmentStatus,
  ShipmentUpdatePayload,
  ShipmentPartyInput,
} from '../models/shipment';

type ShipmentFormMode = 'create' | 'edit';
type CreateStep = 'form' | 'review' | 'payment';

type ShipmentFormProps = {
  mode: ShipmentFormMode;
  shipment?: Shipment;
  onCancel: () => void;
  onCreateComplete: (
    shipment: Shipment,
    message: string,
    outcome?: 'payment_success',
  ) => Promise<void>;
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

function getInitialPaymentDetails(): ShipmentPaymentDetails {
  const nextYear = new Date().getFullYear() + 1;
  return {
    cardHolder: '',
    cardNumber: '',
    expiryMonth: 12,
    expiryYear: nextYear,
    cvv: '',
  };
}

function formatPartyLabel(party: ShipmentPartyInput): string {
  return `${party.firstName} ${party.lastName}`.trim();
}

export function ShipmentForm({
  mode,
  shipment,
  onCancel,
  onCreateComplete,
  onUpdate,
  onError,
}: ShipmentFormProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState(shipment));
  const [createStep, setCreateStep] = useState<CreateStep>('form');
  const [sessionId, setSessionId] = useState<string>();
  const [preview, setPreview] = useState<ShipmentRegistrationPreview>();
  const [paymentRequest, setPaymentRequest] = useState<ShipmentPaymentRequest>();
  const [paymentDetails, setPaymentDetails] = useState<ShipmentPaymentDetails>(
    getInitialPaymentDetails,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    setForm(getInitialState(shipment));
    setCreateStep('form');
    setPreview(undefined);
    setPaymentRequest(undefined);
    setPaymentDetails(getInitialPaymentDetails());
  }, [shipment, mode]);

  useEffect(() => {
    if (mode !== 'create' || sessionStartedRef.current) {
      return;
    }

    sessionStartedRef.current = true;
    void startShipmentRegistration()
      .then((session) => setSessionId(session.sessionId))
      .catch((caught) => {
        sessionStartedRef.current = false;
        onError(caught instanceof Error ? caught.message : 'Failed to start registration session.');
      });
  }, [mode, onError]);

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

  const buildCreatePayload = (): ShipmentCreatePayload => ({
    sender: {
      firstName: form.sender.firstName.trim(),
      lastName: form.sender.lastName.trim(),
      phoneNumber: form.sender.phoneNumber.trim(),
      email: form.sender.email.trim(),
    },
    receiver: {
      firstName: form.receiver.firstName.trim(),
      lastName: form.receiver.lastName.trim(),
      phoneNumber: form.receiver.phoneNumber.trim(),
      email: form.receiver.email.trim(),
    },
    size: form.size,
    dispatchAddress: form.dispatchAddress.trim(),
    destinationAddress: form.destinationAddress.trim(),
    shipmentDate: form.shipmentDate,
    paymentAtLocker: form.paymentAtLocker,
  });

  const validateCreatePayload = (payload: ShipmentCreatePayload): boolean => {
    const shortNames = [
      payload.sender.firstName,
      payload.sender.lastName,
      payload.receiver.firstName,
      payload.receiver.lastName,
    ];
    const shortFields = [
      payload.sender.phoneNumber,
      payload.sender.email,
      payload.receiver.phoneNumber,
      payload.receiver.email,
      payload.dispatchAddress,
      payload.destinationAddress,
    ];

    if (shortNames.some((field) => field.length < 1) || shortFields.some((field) => field.length < 3)) {
      onError('Check sender, receiver and address data before continuing.');
      return false;
    }

    return true;
  };

  const closeCreateForm = async () => {
    if (sessionId) {
      try {
        await cancelShipmentRegistrationSession(sessionId);
      } catch {
        // Ignore cleanup errors for local mock sessions.
      }
    }

    onCancel();
  };

  const submitCreateForm = async () => {
    if (!sessionId) {
      onError('Registration session is still starting. Try again in a moment.');
      return;
    }

    const payload = buildCreatePayload();
    if (!validateCreatePayload(payload)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const nextPreview = await validateShipmentRegistrationForm(sessionId, payload);
      setPreview(nextPreview);
      setCreateStep('review');
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to validate registration form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmRegistration = async () => {
    if (!sessionId) {
      onError('Registration session is missing.');
      return;
    }

    const payload = buildCreatePayload();
    setIsSubmitting(true);
    try {
      const registrationResult = await confirmShipmentRegistration(sessionId, payload);

      if (registrationResult.result === 'registered') {
        await onCreateComplete(
          registrationResult.shipment,
          registrationResult.parcelLabel
            ? `${registrationResult.message} Parcel label: ${registrationResult.parcelLabel}.`
            : registrationResult.message,
        );
        await closeCreateForm();
        return;
      }

      const nextPaymentRequest = await requestShipmentPaymentDetails(sessionId);
      setPaymentRequest(nextPaymentRequest);
      setCreateStep('payment');
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to confirm registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitPayment = async () => {
    if (!sessionId) {
      onError('Registration session is missing.');
      return;
    }

    if (
      paymentDetails.cardHolder.trim().length < 2 ||
      paymentDetails.cardNumber.trim().length < 12 ||
      paymentDetails.cvv.trim().length < 3
    ) {
      onError('Enter complete payment details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentResult = await sendShipmentPaymentDetails(sessionId, {
        cancelPayment: false,
        paymentDetails: {
          ...paymentDetails,
          cardHolder: paymentDetails.cardHolder.trim(),
          cardNumber: paymentDetails.cardNumber.trim(),
          cvv: paymentDetails.cvv.trim(),
        },
      });

      await onCreateComplete(
        paymentResult.shipment,
        paymentResult.parcelLabel
          ? `${paymentResult.message} Parcel label: ${paymentResult.parcelLabel}.`
          : paymentResult.message,
        paymentResult.result === 'confirmed' ? 'payment_success' : undefined,
      );

      if (paymentResult.result !== 'confirmed') {
        onError(paymentResult.message);
      }

      await closeCreateForm();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to process payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelPayment = async () => {
    if (!sessionId) {
      onError('Registration session is missing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentResult = await sendShipmentPaymentDetails(sessionId, {
        cancelPayment: true,
      });
      await onCreateComplete(paymentResult.shipment, paymentResult.message);
      await closeCreateForm();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to cancel payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitEditForm = async () => {
    if (form.dispatchAddress.trim().length < 3 || form.destinationAddress.trim().length < 3) {
      onError('Check the dispatch and destination addresses.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdate({
        sender: form.sender,
        receiver: form.receiver,
        size: form.size,
        dispatchAddress: form.dispatchAddress.trim(),
        destinationAddress: form.destinationAddress.trim(),
        shipmentDate: form.shipmentDate,
        paymentAtLocker: form.paymentAtLocker,
        status: form.status,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'create' && createStep === 'review' && preview) {
    return (
      <section className="locker-form" aria-label="Shipment registration review">
        <header>
          <h3>Review registration</h3>
          <button type="button" onClick={() => void closeCreateForm()}>
            Close
          </button>
        </header>

        <article className="detail-panel payment-preview-card">
          <header>
            <p>Review and confirm</p>
            <h3>{preview.registrationData.size.toUpperCase()} parcel</h3>
          </header>

          <div className="payment-details">
            <div>
              <span>Sender</span>
              <strong>{formatPartyLabel(preview.registrationData.sender)}</strong>
            </div>
            <div>
              <span>Receiver</span>
              <strong>{formatPartyLabel(preview.registrationData.receiver)}</strong>
            </div>
            <div>
              <span>Dispatch address</span>
              <strong>{preview.registrationData.dispatchAddress}</strong>
            </div>
            <div>
              <span>Destination address</span>
              <strong>{preview.registrationData.destinationAddress}</strong>
            </div>
            <div>
              <span>Shipment date</span>
              <strong>{preview.registrationData.shipmentDate ?? '-'}</strong>
            </div>
            <div>
              <span>Payment method</span>
              <strong>
                {preview.registrationData.paymentAtLocker ? 'At locker' : 'Online'}
              </strong>
            </div>
            <div>
              <span>Amount</span>
              <strong>{preview.amount.toFixed(2)} EUR</strong>
            </div>
          </div>
        </article>

        <div className="form-actions">
          <button type="button" disabled={isSubmitting} onClick={() => setCreateStep('form')}>
            Edit
          </button>
          <button type="button" disabled={isSubmitting} onClick={() => void confirmRegistration()}>
            Confirm
          </button>
          <button type="button" disabled={isSubmitting} onClick={() => void closeCreateForm()}>
            Cancel
          </button>
        </div>
      </section>
    );
  }

  if (mode === 'create' && createStep === 'payment' && paymentRequest) {
    return (
      <section className="locker-form" aria-label="Shipment online payment">
        <header>
          <h3>Pay online</h3>
          <button type="button" onClick={() => void closeCreateForm()}>
            Close
          </button>
        </header>

        <article className="detail-panel payment-preview-card">
          <header>
            <p>Payment request</p>
            <h3>{paymentRequest.shipmentCode}</h3>
          </header>

          <div className="payment-details">
            <div>
              <span>Order number</span>
              <strong>{paymentRequest.orderNumber}</strong>
            </div>
            <div>
              <span>Invoice</span>
              <strong>{paymentRequest.invoice ?? '-'}</strong>
            </div>
            <div>
              <span>Amount</span>
              <strong>{paymentRequest.amount.toFixed(2)} EUR</strong>
            </div>
            <div>
              <span>Mock bank rule</span>
              <strong>Card numbers ending in 0000 fail</strong>
            </div>
          </div>
        </article>

        <div className="form-grid">
          <label>
            <span>Card holder</span>
            <input
              value={paymentDetails.cardHolder}
              onChange={(event) =>
                setPaymentDetails({ ...paymentDetails, cardHolder: event.target.value })
              }
            />
          </label>
          <label>
            <span>Card number</span>
            <input
              value={paymentDetails.cardNumber}
              placeholder="4111111111111111"
              onChange={(event) =>
                setPaymentDetails({ ...paymentDetails, cardNumber: event.target.value })
              }
            />
          </label>
          <label>
            <span>Expiry month</span>
            <input
              type="number"
              min={1}
              max={12}
              value={paymentDetails.expiryMonth}
              onChange={(event) =>
                setPaymentDetails({
                  ...paymentDetails,
                  expiryMonth: Number(event.target.value),
                })
              }
            />
          </label>
          <label>
            <span>Expiry year</span>
            <input
              type="number"
              min={new Date().getFullYear()}
              value={paymentDetails.expiryYear}
              onChange={(event) =>
                setPaymentDetails({
                  ...paymentDetails,
                  expiryYear: Number(event.target.value),
                })
              }
            />
          </label>
          <label>
            <span>CVV</span>
            <input
              value={paymentDetails.cvv}
              onChange={(event) =>
                setPaymentDetails({ ...paymentDetails, cvv: event.target.value })
              }
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" disabled={isSubmitting} onClick={() => void submitPayment()}>
            Confirm payment
          </button>
          <button type="button" disabled={isSubmitting} onClick={() => void cancelPayment()}>
            Cancel payment
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="locker-form" aria-label="Shipment form">
      <header>
        <h3>{mode === 'create' ? 'Create shipment' : 'Edit shipment'}</h3>
        <button type="button" onClick={mode === 'create' ? () => void closeCreateForm() : onCancel}>
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
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void (mode === 'create' ? submitCreateForm() : submitEditForm())}
        >
          {mode === 'create' ? 'Review' : 'Save'}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={mode === 'create' ? () => void closeCreateForm() : onCancel}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
