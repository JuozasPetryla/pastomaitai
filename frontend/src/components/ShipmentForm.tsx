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
  siuntejas: ShipmentPartyInput;
  gavejas: ShipmentPartyInput;
  dydis: Shipment['dydis'];
  siuntimoAdresas: string;
  gavimoAdresas: string;
  data: string;
  apmokamasPastomate: boolean;
  busena: ShipmentStatus;
};

const statuses: ShipmentStatus[] = [
  'parengta',
  'apmoketa',
  'uzregistruota',
  'ideta',
  'tranzite',
  'pristatyta',
  'atsiimta',
  'atsaukta',
];

function emptyParty(): ShipmentPartyInput {
  return {
    vardas: '',
    pavarde: '',
    telefonoNr: '',
    elPastas: '',
  };
}

function todayValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function getInitialState(shipment?: Shipment): FormState {
  return {
    siuntejas: shipment
      ? {
          vardas: shipment.siuntejas.vardas,
          pavarde: shipment.siuntejas.pavarde,
          telefonoNr: shipment.siuntejas.telefonoNr,
          elPastas: shipment.siuntejas.elPastas,
        }
      : emptyParty(),
    gavejas: shipment
      ? {
          vardas: shipment.gavejas.vardas,
          pavarde: shipment.gavejas.pavarde,
          telefonoNr: shipment.gavejas.telefonoNr,
          elPastas: shipment.gavejas.elPastas,
        }
      : emptyParty(),
    dydis: shipment?.dydis ?? 'm',
    siuntimoAdresas: shipment?.siuntimoAdresas ?? '',
    gavimoAdresas: shipment?.gavimoAdresas ?? '',
    data: shipment?.data ?? todayValue(),
    apmokamasPastomate: shipment?.apmokamasPastomate ?? false,
    busena: shipment?.busena ?? 'uzregistruota',
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
    side: 'siuntejas' | 'gavejas',
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
    if (form.siuntimoAdresas.trim().length < 3 || form.gavimoAdresas.trim().length < 3) {
      onError('Patikrinkite siuntimo ir gavimo adresus.');
      return;
    }

    const commonPayload = {
      siuntejas: form.siuntejas,
      gavejas: form.gavejas,
      dydis: form.dydis,
      siuntimoAdresas: form.siuntimoAdresas.trim(),
      gavimoAdresas: form.gavimoAdresas.trim(),
      data: form.data,
      apmokamasPastomate: form.apmokamasPastomate,
    };

    if (mode === 'create') {
      await onCreate(commonPayload);
      return;
    }

    await onUpdate({
      ...commonPayload,
      busena: form.busena,
    });
  };

  return (
    <section className="locker-form" aria-label="Siuntos forma">
      <header>
        <h3>{mode === 'create' ? 'Kurti siunta' : 'Redaguoti siunta'}</h3>
        <button type="button" onClick={onCancel}>
          Uzdaryti
        </button>
      </header>

      <div className="form-grid">
        <label>
          <span>Siuntejo vardas</span>
          <input
            value={form.siuntejas.vardas}
            onChange={(event) => setPartyField('siuntejas', 'vardas', event.target.value)}
          />
        </label>
        <label>
          <span>Siuntejo pavarde</span>
          <input
            value={form.siuntejas.pavarde}
            onChange={(event) => setPartyField('siuntejas', 'pavarde', event.target.value)}
          />
        </label>
        <label>
          <span>Siuntejo tel.</span>
          <input
            value={form.siuntejas.telefonoNr}
            onChange={(event) => setPartyField('siuntejas', 'telefonoNr', event.target.value)}
          />
        </label>
        <label>
          <span>Siuntejo el. pastas</span>
          <input
            type="email"
            value={form.siuntejas.elPastas}
            onChange={(event) => setPartyField('siuntejas', 'elPastas', event.target.value)}
          />
        </label>
        <label>
          <span>Gavejo vardas</span>
          <input
            value={form.gavejas.vardas}
            onChange={(event) => setPartyField('gavejas', 'vardas', event.target.value)}
          />
        </label>
        <label>
          <span>Gavejo pavarde</span>
          <input
            value={form.gavejas.pavarde}
            onChange={(event) => setPartyField('gavejas', 'pavarde', event.target.value)}
          />
        </label>
        <label>
          <span>Gavejo tel.</span>
          <input
            value={form.gavejas.telefonoNr}
            onChange={(event) => setPartyField('gavejas', 'telefonoNr', event.target.value)}
          />
        </label>
        <label>
          <span>Gavejo el. pastas</span>
          <input
            type="email"
            value={form.gavejas.elPastas}
            onChange={(event) => setPartyField('gavejas', 'elPastas', event.target.value)}
          />
        </label>
        <label>
          <span>Siuntimo adresas</span>
          <input
            value={form.siuntimoAdresas}
            onChange={(event) => setForm({ ...form, siuntimoAdresas: event.target.value })}
          />
        </label>
        <label>
          <span>Gavimo adresas</span>
          <input
            value={form.gavimoAdresas}
            onChange={(event) => setForm({ ...form, gavimoAdresas: event.target.value })}
          />
        </label>
        <label>
          <span>Dydis</span>
          <select
            value={form.dydis}
            onChange={(event) => setForm({ ...form, dydis: event.target.value as Shipment['dydis'] })}
          >
            <option value="s">S</option>
            <option value="m">M</option>
            <option value="l">L</option>
          </select>
        </label>
        <label>
          <span>Data</span>
          <input
            type="date"
            value={form.data}
            onChange={(event) => setForm({ ...form, data: event.target.value })}
          />
        </label>

        {mode === 'edit' ? (
          <label>
            <span>Busena</span>
            <select
              value={form.busena}
              onChange={(event) =>
                setForm({ ...form, busena: event.target.value as ShipmentStatus })
              }
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
          <span>Apmokama pastomate</span>
          <input
            type="checkbox"
            checked={form.apmokamasPastomate}
            onChange={(event) => setForm({ ...form, apmokamasPastomate: event.target.checked })}
          />
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
