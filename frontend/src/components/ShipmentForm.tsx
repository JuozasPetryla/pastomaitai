import { useEffect, useRef, useState } from 'react';

import {
  cancelShipmentRegistrationSession,
  confirmShipmentRegistration,
  requestShipmentPaymentDetails,
  sendShipmentPaymentDetails,
  startShipmentRegistration,
  validateShipmentRegistrationForm,
} from '../api/shipmentsApi';
import type { LockerListItem } from '../models/locker';
import type {
  Shipment,
  ShipmentCreatePayload,
  ShipmentPaymentDetails,
  ShipmentPaymentRequest,
  ShipmentPartyInput,
  ShipmentRegistrationPreview,
} from '../models/shipment';

type CreateStep = 'form' | 'review' | 'payment';

type ShipmentFormProps = {
  lockers: LockerListItem[];
  onCreateComplete: (shipment: Shipment, message: string) => Promise<void>;
  onError: (message: string) => void;
};

type FormState = {
  sender: ShipmentPartyInput;
  receiver: ShipmentPartyInput;
  size: Shipment['size'];
  dispatchLockerAddress: string;
  destinationLockerAddress: string;
};

function emptyParty(): ShipmentPartyInput {
  return {
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
  };
}

function getInitialPaymentDetails(): ShipmentPaymentDetails {
  return {
    cardHolder: '',
    cardNumber: '',
    expiryMonth: 12,
    expiryYear: new Date().getFullYear() + 1,
    cvv: '',
  };
}

function getInitialState(lockers: LockerListItem[]): FormState {
  return {
    sender: emptyParty(),
    receiver: emptyParty(),
    size: 'm',
    dispatchLockerAddress: lockers[0]?.address ?? '',
    destinationLockerAddress: lockers[1]?.address ?? lockers[0]?.address ?? '',
  };
}

function formatPartyLabel(party: ShipmentPartyInput): string {
  return `${party.firstName} ${party.lastName}`.trim();
}

export function ShipmentForm({ lockers, onCreateComplete, onError }: ShipmentFormProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState(lockers));
  const [createStep, setCreateStep] = useState<CreateStep>('form');
  const [sessionId, setSessionId] = useState<string>();
  const [preview, setPreview] = useState<ShipmentRegistrationPreview>();
  const [paymentRequest, setPaymentRequest] = useState<ShipmentPaymentRequest>();
  const [paymentDetails, setPaymentDetails] = useState<ShipmentPaymentDetails>(
    getInitialPaymentDetails,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sessionRequestRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      dispatchLockerAddress: current.dispatchLockerAddress || lockers[0]?.address || '',
      destinationLockerAddress:
        current.destinationLockerAddress || lockers[1]?.address || lockers[0]?.address || '',
    }));
  }, [lockers]);

  const StartSession = async (): Promise<string> => {
    if (sessionId) {
      return sessionId;
    }

    if (!sessionRequestRef.current) {
      sessionRequestRef.current = startShipmentRegistration()
        .then((session) => {
          setSessionId(session.sessionId);
          return session.sessionId;
        })
        .catch((caught) => {
          sessionRequestRef.current = null;
          throw caught;
        });
    }

    return sessionRequestRef.current;
  };

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

  const RegistrationData = (): ShipmentCreatePayload => ({
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
    dispatchAddress: form.dispatchLockerAddress,
    destinationAddress: form.destinationLockerAddress,
  });

  const ValidateFormData = (payload: ShipmentCreatePayload): boolean => {
    const requiredFields = [
      payload.sender.firstName,
      payload.sender.lastName,
      payload.sender.phoneNumber,
      payload.sender.email,
      payload.receiver.firstName,
      payload.receiver.lastName,
      payload.receiver.phoneNumber,
      payload.receiver.email,
      payload.dispatchAddress,
      payload.destinationAddress,
    ];

    if (requiredFields.some((field) => field.length < 3)) {
      onError('Fill in sender, receiver and locker information before continuing.');
      return false;
    }

    if (payload.dispatchAddress === payload.destinationAddress) {
      onError('Choose different lockers for sending and receiving.');
      return false;
    }

    return true;
  };

  const DeleteSession = async (activeSessionId = sessionId) => {
    if (!activeSessionId) {
      return;
    }

    try {
      await cancelShipmentRegistrationSession(activeSessionId);
    } catch {
      // Session cleanup is best-effort because the registration is already completed or abandoned.
    }
  };

  const FinishForm = async () => {
    const payload = RegistrationData();
    if (!ValidateFormData(payload)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const activeSessionId = await StartSession();
      const nextPreview = await validateShipmentRegistrationForm(activeSessionId, payload);
      setPreview(nextPreview);
      setCreateStep('review');
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to validate registration form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ConfirmForm = async () => {
    setIsSubmitting(true);
    try {
      const activeSessionId = await StartSession();
      const registrationResult = await confirmShipmentRegistration(
        activeSessionId,
        RegistrationData(),
      );

      if (registrationResult.result === 'registered') {
        await onCreateComplete(registrationResult.shipment, registrationResult.message);
        await DeleteSession(activeSessionId);
        return;
      }

      setPaymentRequest(await requestShipmentPaymentDetails(activeSessionId));
      setCreateStep('payment');
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to confirm registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const PayForShipment = async () => {
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
      const activeSessionId = await StartSession();
      const paymentResult = await sendShipmentPaymentDetails(activeSessionId, {
        cancelPayment: false,
        paymentDetails: {
          ...paymentDetails,
          cardHolder: paymentDetails.cardHolder.trim(),
          cardNumber: paymentDetails.cardNumber.trim(),
          cvv: paymentDetails.cvv.trim(),
        },
      });

      if (paymentResult.result !== 'confirmed') {
        onError(paymentResult.message);
        return;
      }

      await onCreateComplete(paymentResult.shipment, paymentResult.message);
      await DeleteSession(activeSessionId);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to process payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createStep === 'review' && preview) {
    return (
      <section className="shipment-form-card" aria-label="Shipment registration review">
        <div className="shipments-section-header">
          <div>
            <p className="eyebrow">Review</p>
            <h3>Confirm shipment details</h3>
          </div>
        </div>

        <div className="review-grid">
          <div>
            <span>Sender</span>
            <strong>{formatPartyLabel(preview.registrationData.sender)}</strong>
          </div>
          <div>
            <span>Receiver</span>
            <strong>{formatPartyLabel(preview.registrationData.receiver)}</strong>
          </div>
          <div>
            <span>Send from</span>
            <strong>{preview.registrationData.dispatchAddress}</strong>
          </div>
          <div>
            <span>Deliver to</span>
            <strong>{preview.registrationData.destinationAddress}</strong>
          </div>
          <div>
            <span>Size</span>
            <strong>{preview.registrationData.size.toUpperCase()}</strong>
          </div>
          <div>
            <span>Amount</span>
            <strong>{preview.amount.toFixed(2)} EUR</strong>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" disabled={isSubmitting} onClick={() => setCreateStep('form')}>
            Edit
          </button>
          <button type="button" disabled={isSubmitting} onClick={() => void ConfirmForm()}>
            Confirm
          </button>
        </div>
      </section>
    );
  }

  if (createStep === 'payment' && paymentRequest) {
    return (
      <section className="shipment-form-card" aria-label="Shipment online payment">
        <div className="shipments-section-header">
          <div>
            <p className="eyebrow">Payment</p>
            <h3>Pay online</h3>
          </div>
          <span className="counter-badge">{paymentRequest.amount.toFixed(2)} EUR</span>
        </div>

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
                setPaymentDetails({ ...paymentDetails, expiryMonth: Number(event.target.value) })
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
                setPaymentDetails({ ...paymentDetails, expiryYear: Number(event.target.value) })
              }
            />
          </label>
          <label>
            <span>CVV</span>
            <input
              value={paymentDetails.cvv}
              onChange={(event) => setPaymentDetails({ ...paymentDetails, cvv: event.target.value })}
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" disabled={isSubmitting} onClick={() => void PayForShipment()}>
            Confirm payment
          </button>
          <button type="button" disabled={isSubmitting} onClick={() => setCreateStep('review')}>
            Back
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="shipment-form-card" aria-label="Shipment registration form">
      <div className="shipments-section-header">
        <div>
          <p className="eyebrow">Shipment registration</p>
          <h3>Send a parcel</h3>
        </div>
      </div>

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
          <span>Send from locker</span>
          <select
            value={form.dispatchLockerAddress}
            onChange={(event) => setForm({ ...form, dispatchLockerAddress: event.target.value })}
          >
            <option value="">Choose locker</option>
            {lockers.map((locker) => (
              <option key={locker.id} value={locker.address}>
                {locker.address}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Deliver to locker</span>
          <select
            value={form.destinationLockerAddress}
            onChange={(event) => setForm({ ...form, destinationLockerAddress: event.target.value })}
          >
            <option value="">Choose locker</option>
            {lockers.map((locker) => (
              <option key={locker.id} value={locker.address}>
                {locker.address}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Parcel size</span>
          <select
            value={form.size}
            onChange={(event) => setForm({ ...form, size: event.target.value as Shipment['size'] })}
          >
            <option value="s">S</option>
            <option value="m">M</option>
            <option value="l">L</option>
          </select>
        </label>
      </div>

      <div className="form-actions">
        <button type="button" disabled={isSubmitting || lockers.length < 2} onClick={() => void FinishForm()}>
          Continue
        </button>
      </div>
    </section>
  );
}
