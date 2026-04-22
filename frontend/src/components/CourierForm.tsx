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
  telefonoNr: string;
  elPastas: string;
  vardas: string;
  pavarde: string;
  pareigos: CourierRole;
};

function getInitialState(courier?: Courier): FormState {
  return {
    telefonoNr: courier?.telefonoNr ?? '',
    elPastas: courier?.elPastas ?? '',
    vardas: courier?.vardas ?? '',
    pavarde: courier?.pavarde ?? '',
    pareigos: courier?.pareigos ?? 'kurjeris',
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
      form.telefonoNr.trim().length < 3 ||
      form.elPastas.trim().length < 3 ||
      form.vardas.trim().length < 1 ||
      form.pavarde.trim().length < 1
    ) {
      onError('Patikrinkite kurjerio duomenis.');
      return;
    }

    const payload = {
      telefono_nr: form.telefonoNr.trim(),
      el_pastas: form.elPastas.trim(),
      vardas: form.vardas.trim(),
      pavarde: form.pavarde.trim(),
      pareigos: form.pareigos,
    };

    if (mode === 'create') {
      await onCreate(payload);
      return;
    }

    await onUpdate(payload);
  };

  return (
    <section className="locker-form" aria-label="Kurjerio forma">
      <header>
        <h3>{mode === 'create' ? 'Kurti kurjeri' : 'Redaguoti kurjeri'}</h3>
        <button type="button" onClick={onCancel}>
          Uzdaryti
        </button>
      </header>

      <div className="form-grid">
        <label>
          <span>Vardas</span>
          <input
            value={form.vardas}
            onChange={(event) => setForm({ ...form, vardas: event.target.value })}
          />
        </label>
        <label>
          <span>Pavarde</span>
          <input
            value={form.pavarde}
            onChange={(event) => setForm({ ...form, pavarde: event.target.value })}
          />
        </label>
        <label>
          <span>Telefono numeris</span>
          <input
            value={form.telefonoNr}
            onChange={(event) => setForm({ ...form, telefonoNr: event.target.value })}
          />
        </label>
        <label>
          <span>El. pastas</span>
          <input
            type="email"
            value={form.elPastas}
            onChange={(event) => setForm({ ...form, elPastas: event.target.value })}
          />
        </label>
        <label>
          <span>Pareigos</span>
          <select
            value={form.pareigos}
            onChange={(event) => setForm({ ...form, pareigos: event.target.value as CourierRole })}
          >
            <option value="kurjeris">Kurjeris</option>
            <option value="administratorius">Administratorius</option>
          </select>
        </label>
      </div>

      <div className="form-actions">
        <button type="button" onClick={() => void submit()}>
          {mode === 'create' ? 'Sukurti' : 'Issaugoti'}
        </button>
        <button type="button" onClick={onCancel}>
          Atsaukti
        </button>
      </div>
    </section>
  );
}
