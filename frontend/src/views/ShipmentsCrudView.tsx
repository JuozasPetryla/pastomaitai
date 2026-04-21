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

type ShipmentsCrudViewProps = {
  refreshToken: number;
  onShipmentsChanged: () => void;
};

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

const currentDateValue = (): string => new Date().toISOString().slice(0, 10);

const emptyForm = (): ShipmentFormState => ({
  siuntejas: emptyParty(),
  gavejas: emptyParty(),
  dydis: 'm',
  gavimoAdresas: '',
  siuntimoAdresas: '',
  data: currentDateValue(),
  apmokamasPastomate: false,
  pastomatoSkyriausId: null,
});

const statusLabels: Record<ShipmentStatus, string> = {
  parengta: 'Parengta',
  apmoketa: 'Apmokėta',
  uzregistruota: 'Užregistruota',
  ideta: 'Įdėta į paštomatą',
  tranzite: 'Tranzite',
  pristatyta: 'Pristatyta',
  atsiimta: 'Atsiimta',
  atsaukta: 'Atšaukta / užbaigta',
};

// --- Helper Functions ---

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
    siuntejas: { ...shipment.siuntejas },
    gavejas: { ...shipment.gavejas },
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
  return `Mokėjimas už siuntą ${shipment.siuntosKodas}`;
}

function buildPaymentReference(shipment: Shipment): string {
  return shipment.saskaita ?? `MOKĖJIMAS-${shipment.siuntosKodas}`;
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

function formatReviewTimestamp(timestamp: string | null): string {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('lt-LT');
}

// --- Sub-Components ---

function ContactSection({
  step,
  title,
  party,
  onChange,
}: {
  step: string;
  title: string;
  party: ShipmentPartyInput;
  onChange: (field: keyof ShipmentPartyInput, value: string) => void;
}) {
  return (
    <div className="checkout-section">
      <div>
        <p className="eyebrow">{step}</p>
        <h4>{title}</h4>
      </div>
      <div className="form-grid">
        <label>
          <span>Vardas</span>
          <input required value={party.vardas} onChange={(e) => onChange('vardas', e.target.value)} />
        </label>
        <label>
          <span>Pavardė</span>
          <input required value={party.pavarde} onChange={(e) => onChange('pavarde', e.target.value)} />
        </label>
        <label>
          <span>Telefono numeris</span>
          <input required value={party.telefonoNr} onChange={(e) => onChange('telefonoNr', e.target.value)} />
        </label>
        <label>
          <span>El. paštas</span>
          <input required type="email" value={party.elPastas} onChange={(e) => onChange('elPastas', e.target.value)} />
        </label>
      </div>
    </div>
  );
}

// --- Main Component ---

export function ShipmentsCrudView({ refreshToken, onShipmentsChanged }: ShipmentsCrudViewProps) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [lockerOptions, setLockerOptions] = useState<LockerAddressOption[]>([]);
  const [form, setForm] = useState<ShipmentFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [paymentPreviewId, setPaymentPreviewId] = useState<number | null>(null);
  const [reviewTimestamp, setReviewTimestamp] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const [nextShipments, pastomatai, demoLocker] = await Promise.all([
          fetchShipments(),
          fetchPastomatai({}).catch(() => []),
          fetchDemoLockerState().catch(() => null),
        ]);

        if (!isMounted) return;

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
        setForm((current) => ({
          ...current,
          siuntimoAdresas: current.siuntimoAdresas || nextOptions[0]?.adresas || '',
          gavimoAdresas: current.gavimoAdresas || nextOptions[1]?.adresas || nextOptions[0]?.adresas || '',
        }));
        setError(null);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Nepavyko gauti duomenų.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [refreshToken]);

  const paymentPreviewShipment = useMemo(
    () => shipments.find((shipment) => shipment.id === paymentPreviewId) ?? null,
    [paymentPreviewId, shipments],
  );

  const setPartyField = (side: 'siuntejas' | 'gavejas', field: keyof ShipmentPartyInput, value: string) => {
    setForm((current) => ({
      ...current,
      [side]: { ...current[side], [field]: value },
    }));
  };

  const resetForm = () => {
    setForm((current) => ({
      ...emptyForm(),
      siuntimoAdresas: current.siuntimoAdresas || lockerOptions[0]?.adresas || '',
      gavimoAdresas: current.gavimoAdresas || lockerOptions[1]?.adresas || lockerOptions[0]?.adresas || '',
    }));
    setEditingId(null);
    setReviewTimestamp(null);
    setIsReviewing(false);
  };

  const handleEnterReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setReviewTimestamp(new Date().toISOString());
    setIsReviewing(true);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const payload: ShipmentFormState = {
        ...form,
        data: reviewTimestamp?.slice(0, 10) ?? currentDateValue(),
      };
      const savedShipment =
        editingId === null ? await createShipment(payload) : await updateShipment(editingId, payload);

      setShipments((current) => upsertShipment(current, savedShipment));
      onShipmentsChanged();
      resetForm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nepavyko išsaugoti siuntos.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (shipmentId: number) => {
    setError(null);
    try {
      await deleteShipment(shipmentId);
      setShipments((current) => current.filter((shipment) => shipment.id !== shipmentId));
      onShipmentsChanged();
      if (editingId === shipmentId) resetForm();
      if (paymentPreviewId === shipmentId) setPaymentPreviewId(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Nepavyko ištrinti siuntos.');
    }
  };

  const handleInternetPayment = async () => {
    if (!paymentPreviewShipment) return;

    try {
      const paidShipment = await payShipment(paymentPreviewShipment.id, 'internet');
      setShipments((current) => upsertShipment(current, paidShipment));
      onShipmentsChanged();
      setPaymentPreviewId(null);
      setError(null);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Nepavyko apmokėti internetu.');
    }
  };

  return (
    <section className="shipments-panel" aria-labelledby="shipments-demo-title">
      <div className="shipments-section-header">
        <div>
          <p className="eyebrow">Siuntų savitarna</p>
          <h3 id="shipments-demo-title">Registracija internetu ir siuntų valdymas</h3>
        </div>
        <button className="secondary-button" type="button" onClick={resetForm}>
          Nauja siunta
        </button>
      </div>

      {error ? <p className="feedback feedback-error">{error}</p> : null}

      <div className="shipments-dashboard">
        <div className="shipments-main-column">
          <form className="shipment-form-card shipment-checkout-card" onSubmit={handleEnterReview}>
            <div className="shipments-section-header">
              <div>
                <p className="eyebrow">WebController</p>
                <h3>Registruoti internetu</h3>
              </div>
              <span className="counter-badge">{PRICE_BY_SIZE[form.dydis].toFixed(2)} EUR</span>
            </div>

            <fieldset className="shipment-form-fieldset" disabled={isReviewing || isSaving}>
              <ContactSection
                step="1 žingsnis"
                title="Siuntėjo kontaktai"
                party={form.siuntejas}
                onChange={(field, value) => setPartyField('siuntejas', field, value)}
              />

              <ContactSection
                step="2 žingsnis"
                title="Gavėjo kontaktai"
                party={form.gavejas}
                onChange={(field, value) => setPartyField('gavejas', field, value)}
              />

              <div className="checkout-section">
                <div>
                  <p className="eyebrow">3 žingsnis</p>
                  <h4>Paštomatai ir siuntos dydis</h4>
                </div>
                <div className="form-grid">
                  <label>
                    <span>Išsiuntimo paštomatas</span>
                    <select
                      required
                      value={form.siuntimoAdresas}
                      onChange={(e) => setForm((current) => ({ ...current, siuntimoAdresas: e.target.value }))}
                    >
                      <option value="">Pasirinkite paštomatą</option>
                      {lockerOptions.map((locker) => (
                        <option key={locker.id} value={locker.adresas}>
                          {locker.adresas}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Atsiėmimo paštomatas</span>
                    <select
                      required
                      value={form.gavimoAdresas}
                      onChange={(e) => setForm((current) => ({ ...current, gavimoAdresas: e.target.value }))}
                    >
                      <option value="">Pasirinkite paštomatą</option>
                      {lockerOptions.map((locker) => (
                        <option key={locker.id} value={locker.adresas}>
                          {locker.adresas}
                        </option>
                      ))}
                    </select>
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
            </fieldset>

            <div className="checkout-summary">
              <div>
                <p className="eyebrow">Apmokėjimas internetu</p>
                <h4>{isReviewing ? 'Registracija paruošta patvirtinimui' : 'Mokama po registracijos'}</h4>
                <span>
                  Registravimo data ir laikas sugeneruojami automatiškai. Internetinei registracijai
                  mokėjimo duomenys bus sugeneruoti pagal pasirinktą dydį.
                </span>
              </div>
              <button className="primary-button" disabled={isSaving || isReviewing} type="submit">
                {isReviewing ? 'Peržiūra parengta' : editingId === null ? 'Peržiūrėti registraciją' : 'Peržiūrėti pakeitimus'}
              </button>
            </div>
          </form>

          {isReviewing && (
            <section className="shipment-form-card checkout-review-card">
              <div className="shipments-section-header">
                <div>
                  <p className="eyebrow">Patvirtinimas</p>
                  <h3>Registracijos peržiūra</h3>
                </div>
                <span className="counter-badge">{PRICE_BY_SIZE[form.dydis].toFixed(2)} EUR</span>
              </div>

              <div className="review-grid">
                <div>
                  <span>Registravimo laikas</span>
                  <strong>{formatReviewTimestamp(reviewTimestamp)}</strong>
                </div>
                <div>
                  <span>Registravimo būdas</span>
                  <strong>Internetu</strong>
                </div>
                <div>
                  <span>Siuntėjas</span>
                  <strong>{form.siuntejas.vardas} {form.siuntejas.pavarde}</strong>
                </div>
                <div>
                  <span>Gavėjas</span>
                  <strong>{form.gavejas.vardas} {form.gavejas.pavarde}</strong>
                </div>
                <div>
                  <span>Siuntimo paštomatas</span>
                  <strong>{form.siuntimoAdresas}</strong>
                </div>
                <div>
                  <span>Atsiėmimo paštomatas</span>
                  <strong>{form.gavimoAdresas}</strong>
                </div>
                <div>
                  <span>Dydis</span>
                  <strong>{form.dydis.toUpperCase()}</strong>
                </div>
                <div>
                  <span>Mokėtina suma</span>
                  <strong>{PRICE_BY_SIZE[form.dydis].toFixed(2)} EUR</strong>
                </div>
              </div>

              <div className="form-actions">
                <button className="secondary-button" type="button" onClick={() => setIsReviewing(false)}>
                  Redaguoti
                </button>
                <button className="primary-button" disabled={isSaving} type="button" onClick={() => void handleSubmit()}>
                  {isSaving ? 'Registruojama...' : editingId === null ? 'Patvirtinti registraciją' : 'Patvirtinti pakeitimus'}
                </button>
              </div>
            </section>
          )}

          <div className="shipments-content-grid">
            <section className="shipment-list-card payment-preview-card">
              <div className="shipments-section-header">
                <div>
                  <p className="eyebrow">Apmokėjimo langas</p>
                  <h3>Internetinis mokėjimas</h3>
                </div>
              </div>

              {paymentPreviewShipment ? (
                <>
                  <div className="payment-details">
                    <div>
                      <span>Mokėjimo gavėjas</span>
                      <strong>Paštomatai UAB</strong>
                    </div>
                    <div>
                      <span>Mokėjimo paskirtis</span>
                      <strong>{buildPaymentSummary(paymentPreviewShipment)}</strong>
                    </div>
                    <div>
                      <span>Įmokos kodas</span>
                      <strong>{buildPaymentReference(paymentPreviewShipment)}</strong>
                    </div>
                    <div>
                      <span>Mokėtina suma</span>
                      <strong>{paymentPreviewShipment.suma.toFixed(2)} EUR</strong>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="primary-button" type="button" onClick={() => void handleInternetPayment()}>
                      Patvirtinti mokėjimą
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setPaymentPreviewId(null)}>
                      Uždaryti
                    </button>
                  </div>
                </>
              ) : (
                <p className="feedback">
                  Pasirinkite registruotą internetinę siuntą ir sugeneruosime mokėjimo informaciją.
                </p>
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

              {isLoading && <p className="feedback">Kraunamos siuntos...</p>}

              {!isLoading && shipments.length === 0 && (
                <p className="feedback">Kol kas nėra nei vienos siuntos.</p>
              )}

              <div className="shipment-list">
                {shipments.map((shipment) => (
                  <article className="shipment-card" key={shipment.id}>
                    <div className="shipment-card-top">
                      <div>
                        <strong>{shipment.siuntosKodas}</strong>
                        <p>Užsakymas #{shipment.uzsakymoNr}</p>
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
                        Registracija: {shipment.apmokamasPastomate ? 'paštomate' : 'internetu'}
                      </span>
                    </div>

                    <div className="shipment-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          setEditingId(shipment.id);
                          setForm(toFormState(shipment));
                          setReviewTimestamp(null);
                          setIsReviewing(false);
                        }}
                      >
                        Redaguoti
                      </button>
                      {!shipment.apmokamasPastomate && canPay(shipment.busena) && (
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => setPaymentPreviewId(shipment.id)}
                        >
                          Mokėti internetu
                        </button>
                      )}
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
      </div>
    </section>
  );
}