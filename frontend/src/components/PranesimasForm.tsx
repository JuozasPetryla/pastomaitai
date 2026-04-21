import { useEffect, useState } from 'react';

import type {
  Pranesimas,
  PranesimasCreatePayload,
  PranesimasUpdatePayload,
  PranesimoTipas,
} from '../models/pranesimas';

type PranesimasFormMode = 'create' | 'edit';

type PranesimasFormProps = {
  mode: PranesimasFormMode;
  pranesimas?: Pranesimas;
  onCancel: () => void;
  onCreate: (payload: PranesimasCreatePayload) => Promise<void>;
  onUpdate: (payload: PranesimasUpdatePayload) => Promise<void>;
  onError: (message: string) => void;
};

type FormState = {
  asmuo_id: string;
  tekstas: string;
  tipas: PranesimoTipas;
  issiuntimo_operatoriui_data: string;
  operatoriaus_atsako_data: string;
  issiustas: boolean;
};

const tipai: PranesimoTipas[] = ['sms', 'el_pastas'];

function getInitialState(mode: PranesimasFormMode, pranesimas?: Pranesimas): FormState {
  return {
    asmuo_id: pranesimas ? String(pranesimas.asmuo_id) : '',
    tekstas: pranesimas?.tekstas ?? '',
    tipas: pranesimas?.tipas ?? 'sms',
    issiuntimo_operatoriui_data: pranesimas?.issiuntimo_operatoriui_data ?? '',
    operatoriaus_atsako_data: pranesimas?.operatoriaus_atsako_data ?? '',
    issiustas: pranesimas?.issiustas ?? false,
  };
}

export function PranesimasForm({
  mode,
  pranesimas,
  onCancel,
  onCreate,
  onUpdate,
  onError,
}: PranesimasFormProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState(mode, pranesimas));

  useEffect(() => {
    setForm(getInitialState(mode, pranesimas));
  }, [mode, pranesimas]);

  const submit = async () => {
    if (form.tekstas.trim().length < 1) {
      onError('Tekstas negali būti tuščias.');
      return;
    }

    if (mode === 'create') {
      const asmuo_id = parseInt(form.asmuo_id, 10);
      if (!asmuo_id || asmuo_id < 1) {
        onError('Įveskite teisingą asmens ID.');
        return;
      }

      await onCreate({
        asmuo_id,
        tekstas: form.tekstas.trim(),
        tipas: form.tipas,
        issiuntimo_operatoriui_data: form.issiuntimo_operatoriui_data || null,
      });
      return;
    }

    await onUpdate({
      tekstas: form.tekstas.trim(),
      tipas: form.tipas,
      issiuntimo_operatoriui_data: form.issiuntimo_operatoriui_data || null,
      operatoriaus_atsako_data: form.operatoriaus_atsako_data || null,
      issiustas: form.issiustas,
    });
  };

  return (
    <section className="locker-form" aria-label="Pranešimo forma">
      <header>
        <h3>{mode === 'create' ? 'Kurti pranešimą' : 'Redaguoti pranešimą'}</h3>
        <button type="button" onClick={onCancel}>
          Uždaryti
        </button>
      </header>

      <div className="form-grid">
        {mode === 'create' && (
          <label>
            <span>Asmens ID</span>
            <input
              type="number"
              min={1}
              value={form.asmuo_id}
              onChange={(event) => setForm({ ...form, asmuo_id: event.target.value })}
            />
          </label>
        )}

        <label>
          <span>Tipas</span>
          <select
            value={form.tipas}
            onChange={(event) => setForm({ ...form, tipas: event.target.value as PranesimoTipas })}
          >
            {tipai.map((tipas) => (
              <option key={tipas} value={tipas}>
                {tipas === 'sms' ? 'SMS' : 'El. paštas'}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Tekstas</span>
          <textarea
            rows={4}
            value={form.tekstas}
            onChange={(event) => setForm({ ...form, tekstas: event.target.value })}
          />
        </label>

        <label>
          <span>Išsiuntimo operatoriui data</span>
          <input
            type="date"
            value={form.issiuntimo_operatoriui_data}
            onChange={(event) =>
              setForm({ ...form, issiuntimo_operatoriui_data: event.target.value })
            }
          />
        </label>

        {mode === 'edit' && (
          <>
            <label>
              <span>Operatoriaus atsako data</span>
              <input
                type="date"
                value={form.operatoriaus_atsako_data}
                onChange={(event) =>
                  setForm({ ...form, operatoriaus_atsako_data: event.target.value })
                }
              />
            </label>

            <label className="checkbox-label">
              <span>Išsiųstas</span>
              <input
                type="checkbox"
                checked={form.issiustas}
                onChange={(event) => setForm({ ...form, issiustas: event.target.checked })}
              />
            </label>
          </>
        )}
      </div>

      <div className="form-actions">
        <button type="button" onClick={submit}>
          {mode === 'create' ? 'Sukurti' : 'Išsaugoti'}
        </button>
        <button type="button" onClick={onCancel}>
          Atšaukti
        </button>
      </div>
    </section>
  );
}