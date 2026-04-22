import { useEffect, useState } from 'react';

import type {
  Courier,
  CourierCreatePayload,
  CourierRole,
  CourierUpdatePayload,
} from '../models/courier';

type CourierFormMode = 'create' | 'edit';

type CourierFormProps = {
  mode: CourierFormMode;
  courier?: Courier;
  onCancel: () => void;
  onCreate: (payload: CourierCreatePayload) => Promise<void>;
  onUpdate: (payload: CourierUpdatePayload) => Promise<void>;
  onError: (message: string) => void;
};

type FormState = {
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  role: CourierRole;
};

function getInitialState(courier?: Courier): FormState {
  return {
    phoneNumber: courier?.phoneNumber ?? '',
    email: courier?.email ?? '',
    firstName: courier?.firstName ?? '',
    lastName: courier?.lastName ?? '',
    role: courier?.role ?? 'courier',
  };
}

export function CourierForm({
  mode,
  courier,
  onCancel,
  onCreate,
  onUpdate,
  onError,
}: CourierFormProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState(courier));

  useEffect(() => {
    setForm(getInitialState(courier));
  }, [courier, mode]);

  const submit = async () => {
    if (
      form.phoneNumber.trim().length < 3 ||
      form.email.trim().length < 3 ||
      form.firstName.trim().length < 1 ||
      form.lastName.trim().length < 1
    ) {
      onError('Check the courier data.');
      return;
    }

    const payload = {
      phoneNumber: form.phoneNumber.trim(),
      email: form.email.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      role: form.role,
    };

    if (mode === 'create') {
      await onCreate(payload);
      return;
    }

    await onUpdate(payload);
  };

  return (
    <section className="locker-form" aria-label="Courier form">
      <header>
        <h3>{mode === 'create' ? 'Create courier' : 'Edit courier'}</h3>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </header>

      <div className="form-grid">
        <label>
          <span>First name</span>
          <input
            value={form.firstName}
            onChange={(event) => setForm({ ...form, firstName: event.target.value })}
          />
        </label>
        <label>
          <span>Last name</span>
          <input
            value={form.lastName}
            onChange={(event) => setForm({ ...form, lastName: event.target.value })}
          />
        </label>
        <label>
          <span>Phone number</span>
          <input
            value={form.phoneNumber}
            onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
          />
        </label>
        <label>
          <span>Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>
        <label>
          <span>Role</span>
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as CourierRole })}
          >
            <option value="courier">Courier</option>
            <option value="administrator">Administrator</option>
          </select>
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
