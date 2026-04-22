import { useEffect, useState } from 'react';

import type {
  Locker,
  LockerCreatePayload,
  LockerUpdatePayload,
  LockerStatus,
  LockerCellSize,
} from '../models/pastomatas';

type LockerFormMode = 'create' | 'edit';

type LockerFormProps = {
  mode: LockerFormMode;
  locker?: Locker;
  onCancel: () => void;
  onCreate: (payload: LockerCreatePayload) => Promise<void>;
  onUpdate: (payload: LockerUpdatePayload) => Promise<void>;
  onError: (message: string) => void;
};

type FormState = {
  address: string;
  productCode: string;
  status: LockerStatus;
  cells: Record<LockerCellSize, number>;
};

const statuses: LockerStatus[] = ['active', 'inactive', 'printing_disabled', 'deleted'];
const sizes: LockerCellSize[] = ['s', 'm', 'l'];

function getInitialState(mode: LockerFormMode, locker?: Locker): FormState {
  return {
    address: locker?.address ?? '',
    productCode: locker?.productCode ?? '',
    status: locker?.status ?? 'inactive',
    cells: {
      s: locker?.cells.filter((cell) => cell.size === 's').length ?? 2,
      m: locker?.cells.filter((cell) => cell.size === 'm').length ?? 6,
      l: locker?.cells.filter((cell) => cell.size === 'l').length ?? 2,
    },
  };
}

export function LockerForm({
  mode,
  locker,
  onCancel,
  onCreate,
  onUpdate,
  onError,
}: LockerFormProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState(mode, locker));

  useEffect(() => {
    setForm(getInitialState(mode, locker));
  }, [mode, locker]);

  const submit = async () => {
    if (form.address.trim().length < 3 || form.productCode.trim().length < 2) {
      onError('Check the address and product code.');
      return;
    }

    if (mode === 'create') {
      const cellGroups = sizes
        .map((size) => ({ size, quantity: form.cells[size] }))
        .filter((group) => group.quantity > 0);

      if (cellGroups.length === 0) {
        onError('Add at least one locker cell.');
        return;
      }

      await onCreate({
        address: form.address.trim(),
        productCode: form.productCode.trim(),
        cellGroups,
      });
      return;
    }

    await onUpdate({
      address: form.address.trim(),
      productCode: form.productCode.trim(),
      status: form.status,
    });
  };

  return (
    <section className="locker-form" aria-label="Locker form">
      <header>
        <h3>{mode === 'create' ? 'Create locker' : 'Edit locker'}</h3>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </header>

      <div className="form-grid">
        <label>
          <span>Address</span>
          <input
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
          />
        </label>

        <label>
          <span>Product code</span>
          <input
            value={form.productCode}
            onChange={(event) => setForm({ ...form, productCode: event.target.value })}
          />
        </label>

        {mode === 'edit' ? (
          <label>
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as LockerStatus })}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            {sizes.map((size) => (
              <label key={size}>
                <span>{size.toUpperCase()} size cells</span>
                <input
                  min={0}
                  max={500}
                  type="number"
                  value={form.cells[size]}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cells: {
                        ...form.cells,
                        [size]: Math.max(0, Number(event.target.value)),
                      },
                    })
                  }
                />
              </label>
            ))}
          </>
        )}
      </div>

      <div className="form-actions">
        <button type="button" onClick={submit}>
          {mode === 'create' ? 'Create' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
