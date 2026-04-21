import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { fetchPastomatai } from '../api/administrationApi';
import { fetchDemoLockerState } from '../api/lockerApi';
import {
  createShipment,
  deleteShipment,
  fetchShipments,
  payShipment,
  updateShipment,
} from '../api/shipmentsApi';
import type { LockerAddressOption } from '../models/locker';
import type { Shipment, ShipmentPartyInput, ShipmentStatus, ShipmentUpsert } from '../models/shipment';
import { LockerView } from './LockerView';

type ShipmentFormState = ShipmentUpsert;

const PRICE_BY_SIZE: Record<Shipment['dydis'], number> = {
  s: 2.49,
  m: 3.99,
  l: 5.99,
};

const emptyParty = (): ShipmentPartyInput => ({
  vardas: '',
  pavarde: '',
  telefonoNr: '',
  elPastas: '',
});

const emptyForm = (): ShipmentFormState => ({
  siuntejas: emptyParty(),
  gavejas: emptyParty(),
  dydis: 'm',
  gavimoAdresas: '',
  siuntimoAdresas: '',
  data: new Date().toISOString().slice(0, 10),
  apmokamasPastomate: false,
  pastomatoSkyriausId: null,
});

const statusLabels: Record<ShipmentStatus, string> = {
  parengta: 'Parengta',
  apmoketa: 'Apmoketa',
  uzregistruota: 'Uzregistruota',
  ideta: 'Ideta i pastomata',
  tranzite: 'Tranzite',
  pristatyta: 'Pristatyta',
  atsiimta: 'Atsiimta',
  atsaukta: 'Atsiimta / uzbaigta',
};

function normalizeShipments(shipments: Shipment[]): Shipment[] {
  return [...shipments].sort((left, right) => right.id - left.id);
}

function upsertShipment(shipments: Shipment[], shipment: Shipment): Shipment[] {
  const existing = shipments.some((item) => item.id === shipment.id);
  if (!existing) {
    return normalizeShipments([shipment, ...shipments]);
  }

  return normalizeShipments(
    shipments.map((item) => (item.id === shipment.id ? shipment : item)),
  );
}

function toFormState(shipment: Shipment): ShipmentFormState {
  return {
    siuntejas: {
      vardas: shipment.siuntejas.vardas,
      pavarde: shipment.siuntejas.pavarde,
      telefonoNr: shipment.siuntejas.telefonoNr,
      elPastas: shipment.siuntejas.elPastas,
    },
    gavejas: {
      vardas: shipment.gavejas.vardas,
      pavarde: shipment.gavejas.pavarde,
      telefonoNr: shipment.gavejas.telefonoNr,
      elPastas: shipment.gavejas.elPastas,
    },
    dydis: shipment.dydis,
    gavimoAdresas: shipment.gavimoAdresas,
    siuntimoAdresas: shipment.siuntimoAdresas,
    data: shipment.data,
    apmokamasPastomate: shipment.apmokamasPastomate,
    pastomatoSkyriausId: shipment.pastomatoSkyriausId,
  };
}

function canPay(status: ShipmentStatus): boolean {
  return status === 'uzregistruota' || status === 'parengta';
}

function buildPaymentSummary(shipment: Shipment): string {
  return `Mokejimas uz siunta ${shipment.siuntosKodas}`;
}

function buildPaymentReference(shipment: Shipment): string {
  return shipment.saskaita ?? `MOKEJIMAS-${shipment.siuntosKodas}`;
}

function buildLockerOptions(
  addresses: Array<{ id: string; adresas: string; produktoKodas: string; yraDemo?: boolean }>,
): LockerAddressOption[] {
  const byAddress = new Map<string, LockerAddressOption>();

  for (const address of addresses) {
    if (!byAddress.has(address.adresas)) {
      byAddress.set(address.adresas, address);
    }
  }

  return [...byAddress.values()];
}

export function ShipmentsCrudView() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [lockerOptions, setLockerOptions] = useState<LockerAddressOption[]>([]);
  const [form, setForm] = useState<ShipmentFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [paymentPreviewId, setPaymentPreviewId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lockerRefreshToken, setLockerRefreshToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [nextShipments, pastomatai, demoLocker] = await Promise.all([
          fetchShipments(),
          fetchPastomatai({}).catch(() => []),
          fetchDemoLockerState().catch(() => null),
        ]);

        if (!isMounted) {
          return;
        }

        const nextOptions = buildLockerOptions([
          ...pastomatai
            .filter((pastomatas) => pastomatas.busena !== 'panaikintas')
            .map((pastomatas) => ({
              id: `admin-${pastomatas.id}`,
              adresas: pastomatas.adresas,
              produktoKodas: pastomatas.produktoKodas,
            })),
          ...(demoLocker
            ? [
                {
                  id: `demo-${demoLocker.id}`,
                  adresas: demoLocker.adresas,
                  produktoKodas: demoLocker.produktoKodas,
                  yraDemo: true,
                },
              ]
            : []),
        ]);

        setShipments(normalizeShipments(nextShipments));
        setLockerOptions(nextOptions);
        setForm((current) => {
          const siuntimoAdresas =
            current.siuntimoAdresas || nextOptions[0]?.adresas || demoLocker?.adresas || '';
          const gavimoAdresas =
            current.gavimoAdresas || nextOptions[1]?.adresas || nextOptions[0]?.adresas || '';

          return {
            ...current,
            siuntimoAdresas,
            gavimoAdresas,
          };
        });
        setError(null);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Nepavyko gauti duomenu.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const paymentPreviewShipment = useMemo(
    () => shipments.find((shipment) => shipment.id === paymentPreviewId) ?? null,
    [paymentPreviewId, shipments],
  );

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

  const resetForm = () => {
    setForm((current) => ({
      ...emptyForm(),
      siuntimoAdresas: current.siuntimoAdresas || lockerOptions[0]?.adresas || '',
      gavimoAdresas: current.gavimoAdresas || lockerOptions[1]?.adresas || lockerOptions[0]?.adresas || '',
    }));
    setEditingId(null);
  };

  const handleShipmentUpsert = (shipment: Shipment) => {
    setShipments((current) => upsertShipment(current, shipment));
    setLockerRefreshToken((current) => current + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const savedShipment =
        editingId === null
          ? await createShipment(form)
          : await updateShipment(editingId, form);

      handleShipmentUpsert(savedShipment);
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nepavyko issaugoti siuntos.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (shipmentId: number) => {
    setError(null);

    try {
      await deleteShipment(shipmentId);
      setShipments((current) => current.filter((shipment) => shipment.id !== shipmentId));
      setLockerRefreshToken((current) => current + 1);
      if (editingId === shipmentId) {
        resetForm();
      }
      if (paymentPreviewId === shipmentId) {
        setPaymentPreviewId(null);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Nepavyko istrinti siuntos.');
    }
  };

  const handleInternetPayment = async () => {
    if (!paymentPreviewShipment) {
      return;
    }

    try {
      const paidShipment = await payShipment(paymentPreviewShipment.id, 'internet');
      handleShipmentUpsert(paidShipment);
      setPaymentPreviewId(null);
      setError(null);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Nepavyko apmoketi internetu.');
    }
  };

  return (
    <section className="shipments-panel" aria-labelledby="shipments-demo-title">
      <div className="shipments-section-header">
        <div>
          <p className="eyebrow">Siuntu savitarna</p>
          <h3 id="shipments-demo-title">Registracija internetu ir siuntu valdymas</h3>
        </div>
        <button className="secondary-button" type="button" onClick={resetForm}>
          Nauja siunta
        </button>
      </div>

      {error ? <p className="feedback feedback-error">{error}</p> : null}

      <div className="shipments-dashboard">
        <div className="shipments-main-column">
          <form className="shipment-form-card shipment-checkout-card" onSubmit={handleSubmit}>
            <div className="shipments-section-header">
              <div>
                <p className="eyebrow">WebController</p>
                <h3>Registruoti internetu</h3>
              </div>
              <span className="counter-badge">{PRICE_BY_SIZE[form.dydis].toFixed(2)} EUR</span>
            </div>

            <div className="checkout-section">
              <div>
                <p className="eyebrow">1 zingsnis</p>
                <h4>Siuntejo kontaktai</h4>
              </div>
              <div className="form-grid">
                <label>
                  <span>Vardas</span>
                  <input
                    required
                    value={form.siuntejas.vardas}
                    onChange={(event) => setPartyField('siuntejas', 'vardas', event.target.value)}
                  />
                </label>
                <label>
                  <span>Pavarde</span>
                  <input
                    required
                    value={form.siuntejas.pavarde}
                    onChange={(event) => setPartyField('siuntejas', 'pavarde', event.target.value)}
                  />
                </label>
                <label>
                  <span>Telefono numeris</span>
                  <input
                    required
                    value={form.siuntejas.telefonoNr}
                    onChange={(event) => setPartyField('siuntejas', 'telefonoNr', event.target.value)}
                  />
                </label>
                <label>
                  <span>El. pastas</span>
                  <input
                    required
                    type="email"
                    value={form.siuntejas.elPastas}
                    onChange={(event) => setPartyField('siuntejas', 'elPastas', event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="checkout-section">
              <div>
                <p className="eyebrow">2 zingsnis</p>
                <h4>Gavejo kontaktai</h4>
              </div>
              <div className="form-grid">
                <label>
                  <span>Vardas</span>
                  <input
                    required
                    value={form.gavejas.vardas}
                    onChange={(event) => setPartyField('gavejas', 'vardas', event.target.value)}
                  />
                </label>
                <label>
                  <span>Pavarde</span>
                  <input
                    required
                    value={form.gavejas.pavarde}
                    onChange={(event) => setPartyField('gavejas', 'pavarde', event.target.value)}
                  />
                </label>
                <label>
                  <span>Telefono numeris</span>
                  <input
                    required
                    value={form.gavejas.telefonoNr}
                    onChange={(event) => setPartyField('gavejas', 'telefonoNr', event.target.value)}
                  />
                </label>
                <label>
                  <span>El. pastas</span>
                  <input
                    required
                    type="email"
                    value={form.gavejas.elPastas}
                    onChange={(event) => setPartyField('gavejas', 'elPastas', event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="checkout-section">
              <div>
                <p className="eyebrow">3 zingsnis</p>
                <h4>Paštomatai ir siuntos dydis</h4>
              </div>
              <div className="form-grid">
                <label>
                  <span>Isiuntimo pastomatas</span>
                  <select
                    required
                    value={form.siuntimoAdresas}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, siuntimoAdresas: event.target.value }))
                    }
                  >
                    <option value="">Pasirinkite pastomata</option>
                    {lockerOptions.map((locker) => (
                      <option key={locker.id} value={locker.adresas}>
                        {locker.adresas}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Atsiemimo pastomatas</span>
                  <select
                    required
                    value={form.gavimoAdresas}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, gavimoAdresas: event.target.value }))
                    }
                  >
                    <option value="">Pasirinkite pastomata</option>
                    {lockerOptions.map((locker) => (
                      <option key={locker.id} value={locker.adresas}>
                        {locker.adresas}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Registravimo data</span>
                  <input
                    required
                    type="date"
                    value={form.data}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, data: event.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="size-selector">
                {(['s', 'm', 'l'] as const).map((size) => (
                  <button
                    key={size}
                    className={`size-card ${form.dydis === size ? 'active' : ''}`}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, dydis: size }))}
                  >
                    <strong>{size.toUpperCase()}</strong>
                    <span>{PRICE_BY_SIZE[size].toFixed(2)} EUR</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="checkout-summary">
              <div>
                <p className="eyebrow">Apmokejimas internetu</p>
                <h4>Mokama po registracijos</h4>
                <span>Sistema sugeneruos mokejimo paskirti ir suma pagal pasirinkta dydi.</span>
              </div>
              <button className="primary-button" disabled={isSaving} type="submit">
                {isSaving ? 'Registruojama...' : editingId === null ? 'Registruoti siunta' : 'Atnaujinti siunta'}
              </button>
            </div>
          </form>

          <div className="shipments-content-grid">
            <section className="shipment-list-card payment-preview-card">
              <div className="shipments-section-header">
                <div>
                  <p className="eyebrow">Apmokejimo langas</p>
                  <h3>Internetinis mokejimas</h3>
                </div>
              </div>

              {paymentPreviewShipment ? (
                <>
                  <div className="payment-details">
                    <div>
                      <span>Mokejimo gavejas</span>
                      <strong>Pastomatai UAB</strong>
                    </div>
                    <div>
                      <span>Mokejimo paskirtis</span>
                      <strong>{buildPaymentSummary(paymentPreviewShipment)}</strong>
                    </div>
                    <div>
                      <span>Imokos kodas</span>
                      <strong>{buildPaymentReference(paymentPreviewShipment)}</strong>
                    </div>
                    <div>
                      <span>Moketina suma</span>
                      <strong>{paymentPreviewShipment.suma.toFixed(2)} EUR</strong>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="primary-button" type="button" onClick={() => void handleInternetPayment()}>
                      Patvirtinti mokejima
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setPaymentPreviewId(null)}>
                      Uzdaryti
                    </button>
                  </div>
                </>
              ) : (
                <p className="feedback">Pasirinkite registruota internetine siunta ir sugeneruosime mokejimo informacija.</p>
              )}
            </section>

            <section className="shipment-list-card">
              <div className="shipments-section-header">
                <div>
                  <p className="eyebrow">ParcelController</p>
                  <h3>Visos siuntos</h3>
                </div>
                <span className="counter-badge">{shipments.length}</span>
              </div>

              {isLoading ? <p className="feedback">Kraunamos siuntos...</p> : null}

              {!isLoading && shipments.length === 0 ? (
                <p className="feedback">Kol kas nera nei vienos siuntos.</p>
              ) : null}

              <div className="shipment-list">
                {shipments.map((shipment) => (
                  <article className="shipment-card" key={shipment.id}>
                    <div className="shipment-card-top">
                      <div>
                        <strong>{shipment.siuntosKodas}</strong>
                        <p>Uzsakymas #{shipment.uzsakymoNr}</p>
                      </div>
                      <span className="status-pill">{statusLabels[shipment.busena]}</span>
                    </div>

                    <div className="shipment-meta">
                      <span>
                        {shipment.siuntejas.vardas} {shipment.siuntejas.pavarde} {'->'} {shipment.gavejas.vardas}{' '}
                        {shipment.gavejas.pavarde}
                      </span>
                      <span>
                        {shipment.siuntimoAdresas} / {shipment.gavimoAdresas}
                      </span>
                      <span>
                        Dydis {shipment.dydis.toUpperCase()} | Suma {shipment.suma.toFixed(2)} EUR
                      </span>
                      <span>
                        Registracija: {shipment.apmokamasPastomate ? 'pastomate' : 'internetu'}
                      </span>
                    </div>

                    <div className="shipment-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          setEditingId(shipment.id);
                          setForm(toFormState(shipment));
                        }}
                      >
                        Redaguoti
                      </button>
                      {!shipment.apmokamasPastomate && canPay(shipment.busena) ? (
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => setPaymentPreviewId(shipment.id)}
                        >
                          Moketi internetu
                        </button>
                      ) : null}
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => void handleDelete(shipment.id)}
                      >
                        Trinti
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>

        <LockerView
          lockerOptions={lockerOptions}
          refreshToken={lockerRefreshToken}
          shipments={shipments}
          onShipmentUpsert={handleShipmentUpsert}
        />
      </div>
    </section>
  );
}
