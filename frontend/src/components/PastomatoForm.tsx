import { useEffect, useState } from 'react';

import type {
  Pastomatas,
  PastomatasCreatePayload,
  PastomatasUpdatePayload,
  PastomatoBusena,
  SiuntosDydis,
} from '../models/pastomatas';

type PastomatoFormMode = 'create' | 'edit';

type PastomatoFormProps = {
  mode: PastomatoFormMode;
  pastomatas?: Pastomatas;
  onCancel: () => void;
  onCreate: (payload: PastomatasCreatePayload) => Promise<void>;
  onUpdate: (payload: PastomatasUpdatePayload) => Promise<void>;
  onError: (message: string) => void;
};

type FormState = {
  adresas: string;
  produktoKodas: string;
  busena: PastomatoBusena;
  skyriai: Record<SiuntosDydis, number>;
};

const busenos: PastomatoBusena[] = ['aktyvus', 'neaktyvus', 'negali_spausdinti', 'panaikintas'];
const dydziai: SiuntosDydis[] = ['s', 'm', 'l'];

function getInitialState(mode: PastomatoFormMode, pastomatas?: Pastomatas): FormState {
  return {
    adresas: pastomatas?.adresas ?? '',
    produktoKodas: pastomatas?.produktoKodas ?? '',
    busena: pastomatas?.busena ?? 'neaktyvus',
    skyriai: {
      s: pastomatas?.skyriai.filter((skyrius) => skyrius.dydis === 's').length ?? 2,
      m: pastomatas?.skyriai.filter((skyrius) => skyrius.dydis === 'm').length ?? 6,
      l: pastomatas?.skyriai.filter((skyrius) => skyrius.dydis === 'l').length ?? 2,
    },
  };
}

export function PastomatoForm({
  mode,
  pastomatas,
  onCancel,
  onCreate,
  onUpdate,
  onError,
}: PastomatoFormProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState(mode, pastomatas));

  useEffect(() => {
    setForm(getInitialState(mode, pastomatas));
  }, [mode, pastomatas]);

  const submit = async () => {
    if (form.adresas.trim().length < 3 || form.produktoKodas.trim().length < 2) {
      onError('Patikrinkite adresą ir produkto kodą.');
      return;
    }

    if (mode === 'create') {
      const skyriai = dydziai
        .map((dydis) => ({ dydis, kiekis: form.skyriai[dydis] }))
        .filter((grupe) => grupe.kiekis > 0);

      if (skyriai.length === 0) {
        onError('Reikia pridėti bent vieną skyrių.');
        return;
      }

      await onCreate({
        adresas: form.adresas.trim(),
        produkto_kodas: form.produktoKodas.trim(),
        skyriai,
      });
      return;
    }

    await onUpdate({
      adresas: form.adresas.trim(),
      produkto_kodas: form.produktoKodas.trim(),
      busena: form.busena,
    });
  };

  return (
    <section className="locker-form" aria-label="Paštomato forma">
      <header>
        <h3>{mode === 'create' ? 'Kurti paštomatą' : 'Redaguoti paštomatą'}</h3>
        <button type="button" onClick={onCancel}>
          Uždaryti
        </button>
      </header>

      <div className="form-grid">
        <label>
          <span>Adresas</span>
          <input
            value={form.adresas}
            onChange={(event) => setForm({ ...form, adresas: event.target.value })}
          />
        </label>

        <label>
          <span>Produkto kodas</span>
          <input
            value={form.produktoKodas}
            onChange={(event) => setForm({ ...form, produktoKodas: event.target.value })}
          />
        </label>

        {mode === 'edit' ? (
          <label>
            <span>Būsena</span>
            <select
              value={form.busena}
              onChange={(event) =>
                setForm({ ...form, busena: event.target.value as PastomatoBusena })
              }
            >
              {busenos.map((busena) => (
                <option key={busena} value={busena}>
                  {busena}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            {dydziai.map((dydis) => (
              <label key={dydis}>
                <span>{dydis.toUpperCase()} dydžio skyriai</span>
                <input
                  min={0}
                  max={500}
                  type="number"
                  value={form.skyriai[dydis]}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      skyriai: {
                        ...form.skyriai,
                        [dydis]: Math.max(0, Number(event.target.value)),
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
          {mode === 'create' ? 'Sukurti' : 'Išsaugoti'}
        </button>
        <button type="button" onClick={onCancel}>
          Atšaukti
        </button>
      </div>
    </section>
  );
}
