import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { fetchPastomatai } from '../api/administrationApi';
import {
  closeLockerDoors,
  deliverToPickupLocker,
  fetchDemoLockerState,
  openPickupLocker,
  openSendLocker,
  payAtLocker,
  registerAtLocker,
} from '../api/lockerApi';
import { fetchShipments } from '../api/shipmentsApi';
import type {
  LockerActionResult,
  LockerAddressOption,
  LockerRegistration,
  LockerState,
} from '../models/locker';
import type { Shipment, ShipmentPartyInput } from '../models/shipment';

type LockerViewProps = {
  isOpen: boolean;
  onClose: () => void;
  refreshToken: number;
  onShipmentsChanged: () => void;
};

type LockerScreen = 'home' | 'register' | 'register-review' | 'service';
type LockerServiceAction = 'pay' | 'send' | 'deliver' | 'pickup';

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

const buildInitialRegistration = (sourceAddress = '', destinationAddress = ''): LockerRegistration => ({
  siuntejas: emptyParty(),
  gavejas: emptyParty(),
  dydis: 'm',
  gavimoAdresas: destinationAddress,
  siuntimoAdresas: sourceAddress,
  data: currentDateValue(),
});

function buildPaymentSummary(shipment: Shipment): string {
  return shipment.saskaita ?? `MOKEJIMAS-${shipment.siuntosKodas}`;
}

function upsertShipment(shipments: Shipment[], shipment: Shipment): Shipment[] {
  const existing = shipments.some((item) => item.id === shipment.id);
  if (!existing) {
    return [shipment, ...shipments].sort((left, right) => right.id - left.id);
  }

  return shipments
    .map((item) => (item.id === shipment.id ? shipment : item))
    .sort((left, right) => right.id - left.id);
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

function formatDateTime(timestamp: string | null): string {
  if (!timestamp) {
    return '-';
  }

  return new Date(timestamp).toLocaleString('lt-LT');
}

export function LockerView({ isOpen, onClose, refreshToken, onShipmentsChanged }: LockerViewProps) {
  const [lockerState, setLockerState] = useState<LockerState | null>(null);
  const [lockerOptions, setLockerOptions] = useState<LockerAddressOption[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [screen, setScreen] = useState<LockerScreen>('home');
  const [serviceAction, setServiceAction] = useState<LockerServiceAction>('send');
  const [registration, setRegistration] = useState<LockerRegistration>(buildInitialRegistration());
  const [reviewTimestamp, setReviewTimestamp] = useState<string | null>(null);
  const [lockerPaymentCode, setLockerPaymentCode] = useState('');
  const [sendCode, setSendCode] = useState('');
  const [deliverCode, setDeliverCode] = useState('');
  const [pickupCode, setPickupCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setScreen('home');
    setServiceAction('send');
    setReviewTimestamp(null);
    setLockerPaymentCode('');
    setSendCode('');
    setDeliverCode('');
    setPickupCode('');
    setError(null);
    setMessage(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        const [demoLocker, nextShipments, pastomatai] = await Promise.all([
          fetchDemoLockerState(),
          fetchShipments(),
          fetchPastomatai({}).catch(() => []),
        ]);

        if (!isMounted) {
          return;
        }

        const nextLockerOptions = buildLockerOptions([
          ...pastomatai
            .filter((pastomatas) => pastomatas.busena !== 'panaikintas')
            .map((pastomatas) => ({
              id: `admin-${pastomatas.id}`,
              adresas: pastomatas.adresas,
              produktoKodas: pastomatas.produktoKodas,
            })),
          {
            id: `demo-${demoLocker.id}`,
            adresas: demoLocker.adresas,
            produktoKodas: demoLocker.produktoKodas,
            yraDemo: true,
          },
        ]);

        setLockerState(demoLocker);
        setLockerOptions(nextLockerOptions);
        setShipments(nextShipments);
        setRegistration((current) => ({
          ...current,
          siuntimoAdresas: demoLocker.adresas,
          gavimoAdresas: current.gavimoAdresas || nextLockerOptions[0]?.adresas || demoLocker.adresas,
        }));
        setError(null);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Nepavyko gauti pastomato bukles.');
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, refreshToken]);

  const payableAtLocker = useMemo(
    () =>
      shipments.filter(
        (shipment) =>
          shipment.apmokamasPastomate &&
          (shipment.busena === 'uzregistruota' || shipment.busena === 'parengta'),
      ),
    [shipments],
  );

  const readyForSend = useMemo(
    () =>
      shipments.filter(
        (shipment) => shipment.busena === 'apmoketa' && shipment.pastomatoSkyriausId === null,
      ),
    [shipments],
  );

  const readyForDelivery = useMemo(
    () => shipments.filter((shipment) => shipment.busena === 'ideta'),
    [shipments],
  );

  const readyForPickup = useMemo(
    () => shipments.filter((shipment) => shipment.busena === 'pristatyta'),
    [shipments],
  );

  const selectedPaymentShipment = useMemo(
    () => payableAtLocker.find((shipment) => shipment.siuntosKodas === lockerPaymentCode) ?? null,
    [lockerPaymentCode, payableAtLocker],
  );

  const selectedSendShipment = useMemo(
    () => readyForSend.find((shipment) => shipment.siuntosKodas === sendCode) ?? null,
    [readyForSend, sendCode],
  );

  const selectedDeliverShipment = useMemo(
    () => readyForDelivery.find((shipment) => shipment.siuntosKodas === deliverCode) ?? null,
    [deliverCode, readyForDelivery],
  );

  const selectedPickupShipment = useMemo(
    () => readyForPickup.find((shipment) => shipment.siuntosKodas === pickupCode) ?? null,
    [pickupCode, readyForPickup],
  );

  const freeCellCounts = useMemo(() => {
    const counts = { s: 0, m: 0, l: 0 };

    for (const cell of lockerState?.skyriai ?? []) {
      if (!cell.uzimtas) {
        counts[cell.dydis] += 1;
      }
    }

    return counts;
  }, [lockerState]);

  const setPartyField = (
    side: 'siuntejas' | 'gavejas',
    field: keyof ShipmentPartyInput,
    value: string,
  ) => {
    setRegistration((current) => ({
      ...current,
      [side]: {
        ...current[side],
        [field]: value,
      },
    }));
  };

  const resetRegistration = () => {
    setRegistration(
      buildInitialRegistration(
        lockerState?.adresas ?? '',
        lockerOptions[0]?.adresas ?? lockerState?.adresas ?? '',
      ),
    );
    setReviewTimestamp(null);
  };

  const handleLockerAction = async (
    operation: () => Promise<LockerActionResult>,
    fallbackMessage: string,
  ) => {
    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await operation();
      setLockerState(result.locker);
      if (result.siunta) {
        const updatedShipment = result.siunta;
        setShipments((current) => upsertShipment(current, updatedShipment));
        onShipmentsChanged();
      }
      setMessage(result.zinute);
      return result;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : fallbackMessage);
      return null;
    } finally {
      setIsBusy(false);
    }
  };

  const handleRegistrationReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setReviewTimestamp(new Date().toISOString());
    setScreen('register-review');
  };

  const handleRegistrationConfirm = async () => {
    const result = await handleLockerAction(
      () =>
        registerAtLocker({
          ...registration,
          data: reviewTimestamp?.slice(0, 10) ?? currentDateValue(),
        }),
      'Nepavyko uzregistruoti siuntos pastomate.',
    );

    if (!result?.siunta) {
      return;
    }

    setLockerPaymentCode(result.siunta.siuntosKodas);
    resetRegistration();
    setServiceAction('pay');
    setScreen('service');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="locker-modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="locker-window-title"
        aria-modal="true"
        className="locker-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="locker-modal-header">
          <div>
            <p className="eyebrow">LockerView</p>
            <h3 id="locker-window-title">Pastomato simuliacija</h3>
          </div>
          <div className="locker-modal-header-actions">
            {lockerState ? <span className="counter-badge">{lockerState.produktoKodas}</span> : null}
            <button className="locker-modal-close" type="button" onClick={onClose}>
              Uzdaryti
            </button>
          </div>
        </div>

        <div className="locker-terminal-shell locker-terminal-shell-modal">
          <div className="locker-terminal-body">
            <div className="locker-screen">
              <div className="locker-screen-header">
                <span>{lockerState?.adresas ?? 'Kraunamas pastomatas...'}</span>
                <strong>{screen === 'service' ? serviceAction.toUpperCase() : screen.toUpperCase()}</strong>
              </div>

              {error ? <p className="feedback feedback-error">{error}</p> : null}
              {message ? <p className="feedback feedback-success">{message}</p> : null}

              {screen === 'home' ? (
                <div className="terminal-panel">
                  <h4>Pasirinkite veiksmus</h4>
                  <p className="terminal-copy">
                    Pagrindinis simuliacijos langas rodo tik registravimo ir siuntimo kryptis. Toliau
                    sistema jus nuves i reikiama srauta.
                  </p>
                  <div className="terminal-home-actions">
                    <button className="primary-button" type="button" onClick={() => setScreen('register')}>
                      Registruoti siunta
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setServiceAction('send');
                        setScreen('service');
                      }}
                    >
                      Siusti / aptarnauti
                    </button>
                  </div>
                  <div className="terminal-stats">
                    <div>
                      <span>Laisvi S skyriai</span>
                      <strong>{freeCellCounts.s}</strong>
                    </div>
                    <div>
                      <span>Laisvi M skyriai</span>
                      <strong>{freeCellCounts.m}</strong>
                    </div>
                    <div>
                      <span>Laisvi L skyriai</span>
                      <strong>{freeCellCounts.l}</strong>
                    </div>
                  </div>
                </div>
              ) : null}

              {screen === 'register' ? (
                <form className="terminal-panel" onSubmit={handleRegistrationReview}>
                  <div className="shipments-section-header">
                    <div>
                      <h4>Registruoti pastomate</h4>
                      <p className="terminal-copy">
                        Siuntimo pastomatas parenkamas automatiskai pagal si terminala, o laikas bus
                        sugeneruotas registracijos metu.
                      </p>
                    </div>
                    <button className="secondary-button" type="button" onClick={() => setScreen('home')}>
                      Atgal
                    </button>
                  </div>

                  <fieldset className="shipment-form-fieldset" disabled={isBusy}>
                    <div className="terminal-form-grid terminal-form-grid-wide">
                      <label>
                        <span>Siuntejo vardas</span>
                        <input
                          required
                          value={registration.siuntejas.vardas}
                          onChange={(event) => setPartyField('siuntejas', 'vardas', event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Siuntejo pavarde</span>
                        <input
                          required
                          value={registration.siuntejas.pavarde}
                          onChange={(event) => setPartyField('siuntejas', 'pavarde', event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Siuntejo tel.</span>
                        <input
                          required
                          value={registration.siuntejas.telefonoNr}
                          onChange={(event) => setPartyField('siuntejas', 'telefonoNr', event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Siuntejo el. pastas</span>
                        <input
                          required
                          type="email"
                          value={registration.siuntejas.elPastas}
                          onChange={(event) => setPartyField('siuntejas', 'elPastas', event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Gavejo vardas</span>
                        <input
                          required
                          value={registration.gavejas.vardas}
                          onChange={(event) => setPartyField('gavejas', 'vardas', event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Gavejo pavarde</span>
                        <input
                          required
                          value={registration.gavejas.pavarde}
                          onChange={(event) => setPartyField('gavejas', 'pavarde', event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Gavejo tel.</span>
                        <input
                          required
                          value={registration.gavejas.telefonoNr}
                          onChange={(event) => setPartyField('gavejas', 'telefonoNr', event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Gavejo el. pastas</span>
                        <input
                          required
                          type="email"
                          value={registration.gavejas.elPastas}
                          onChange={(event) => setPartyField('gavejas', 'elPastas', event.target.value)}
                        />
                      </label>
                      <label>
                        <span>Siuntimo pastomatas</span>
                        <input disabled value={registration.siuntimoAdresas || lockerState?.adresas || ''} />
                      </label>
                      <label>
                        <span>Atsiemimo pastomatas</span>
                        <select
                          required
                          value={registration.gavimoAdresas}
                          onChange={(event) =>
                            setRegistration((current) => ({
                              ...current,
                              gavimoAdresas: event.target.value,
                            }))
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
                    </div>

                    <div className="terminal-size-row">
                      {(['s', 'm', 'l'] as const).map((size) => (
                        <button
                          key={size}
                          className={`terminal-size-button ${registration.dydis === size ? 'active' : ''}`}
                          type="button"
                          onClick={() =>
                            setRegistration((current) => ({
                              ...current,
                              dydis: size,
                            }))
                          }
                        >
                          <strong>{size.toUpperCase()}</strong>
                          <span>{PRICE_BY_SIZE[size].toFixed(2)} EUR</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="form-actions">
                    <button className="primary-button" disabled={isBusy} type="submit">
                      Perziureti registracija
                    </button>
                  </div>
                </form>
              ) : null}

              {screen === 'register-review' ? (
                <div className="terminal-panel">
                  <div className="shipments-section-header">
                    <div>
                      <h4>Patvirtinti registracija</h4>
                      <p className="terminal-copy">
                        Pries galutini patvirtinima galite grizti ir redaguoti duomenis.
                      </p>
                    </div>
                    <span className="counter-badge">{PRICE_BY_SIZE[registration.dydis].toFixed(2)} EUR</span>
                  </div>

                  <div className="review-grid">
                    <div>
                      <span>Registravimo laikas</span>
                      <strong>{formatDateTime(reviewTimestamp)}</strong>
                    </div>
                    <div>
                      <span>Dabartinis pastomatas</span>
                      <strong>{registration.siuntimoAdresas}</strong>
                    </div>
                    <div>
                      <span>Siuntejas</span>
                      <strong>{registration.siuntejas.vardas} {registration.siuntejas.pavarde}</strong>
                    </div>
                    <div>
                      <span>Gavejas</span>
                      <strong>{registration.gavejas.vardas} {registration.gavejas.pavarde}</strong>
                    </div>
                    <div>
                      <span>Atsiemimo pastomatas</span>
                      <strong>{registration.gavimoAdresas}</strong>
                    </div>
                    <div>
                      <span>Siuntos dydis</span>
                      <strong>{registration.dydis.toUpperCase()}</strong>
                    </div>
                    <div>
                      <span>Moketina suma</span>
                      <strong>{PRICE_BY_SIZE[registration.dydis].toFixed(2)} EUR</strong>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button className="secondary-button" type="button" onClick={() => setScreen('register')}>
                      Redaguoti
                    </button>
                    <button className="primary-button" disabled={isBusy} type="button" onClick={() => void handleRegistrationConfirm()}>
                      Patvirtinti registracija
                    </button>
                  </div>
                </div>
              ) : null}

              {screen === 'service' ? (
                <div className="terminal-panel">
                  <div className="shipments-section-header">
                    <div>
                      <h4>Siuntimo ir aptarnavimo langas</h4>
                      <p className="terminal-copy">
                        Siuntimo metu rodome tik laisvu skyriu kieki pagal siuntos dydi, o sistema pati
                        atidaro pirma tinkama skyriu.
                      </p>
                    </div>
                    <button className="secondary-button" type="button" onClick={() => setScreen('home')}>
                      Atgal
                    </button>
                  </div>

                  <div className="service-mode-switch">
                    {([
                      ['pay', 'Moketi'],
                      ['send', 'Siusti'],
                      ['deliver', 'Pristatyti'],
                      ['pickup', 'Atsiimti'],
                    ] as const).map(([action, label]) => (
                      <button
                        key={action}
                        className={serviceAction === action ? 'active' : ''}
                        type="button"
                        onClick={() => setServiceAction(action)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {serviceAction === 'pay' ? (
                    <>
                      <select value={lockerPaymentCode} onChange={(event) => setLockerPaymentCode(event.target.value)}>
                        <option value="">Pasirinkite siunta apmokejimui</option>
                        {payableAtLocker.map((shipment) => (
                          <option key={shipment.id} value={shipment.siuntosKodas}>
                            {shipment.siuntosKodas}
                          </option>
                        ))}
                      </select>

                      {selectedPaymentShipment ? (
                        <div className="terminal-receipt">
                          <div>
                            <span>Siunta</span>
                            <strong>{selectedPaymentShipment.siuntosKodas}</strong>
                          </div>
                          <div>
                            <span>Dydis</span>
                            <strong>{selectedPaymentShipment.dydis.toUpperCase()}</strong>
                          </div>
                          <div>
                            <span>Moketina suma</span>
                            <strong>{selectedPaymentShipment.suma.toFixed(2)} EUR</strong>
                          </div>
                          <div>
                            <span>Mokejimo kodas</span>
                            <strong>{buildPaymentSummary(selectedPaymentShipment)}</strong>
                          </div>
                        </div>
                      ) : (
                        <p className="terminal-copy">
                          Pasirinkite registruota siunta ir sistema sugeneruos mokejimo informacija.
                        </p>
                      )}

                      <button
                        className="primary-button"
                        disabled={isBusy || !selectedPaymentShipment}
                        type="button"
                        onClick={() =>
                          void handleLockerAction(
                            () => payAtLocker(lockerPaymentCode),
                            'Nepavyko apmoketi pastomate.',
                          )
                        }
                      >
                        Apmoketi pastomate
                      </button>
                    </>
                  ) : null}

                  {serviceAction === 'send' ? (
                    <>
                      <select value={sendCode} onChange={(event) => setSendCode(event.target.value)}>
                        <option value="">Pasirinkite apmoketa siunta</option>
                        {readyForSend.map((shipment) => (
                          <option key={shipment.id} value={shipment.siuntosKodas}>
                            {shipment.siuntosKodas}
                          </option>
                        ))}
                      </select>

                      <div className="terminal-size-stats">
                        <div className={selectedSendShipment?.dydis === 's' ? 'active' : ''}>
                          <span>Laisvi S skyriai</span>
                          <strong>{freeCellCounts.s}</strong>
                        </div>
                        <div className={selectedSendShipment?.dydis === 'm' ? 'active' : ''}>
                          <span>Laisvi M skyriai</span>
                          <strong>{freeCellCounts.m}</strong>
                        </div>
                        <div className={selectedSendShipment?.dydis === 'l' ? 'active' : ''}>
                          <span>Laisvi L skyriai</span>
                          <strong>{freeCellCounts.l}</strong>
                        </div>
                      </div>

                      {selectedSendShipment ? (
                        <p className="terminal-copy">
                          Siuntai {selectedSendShipment.siuntosKodas} bus priskirtas pirmas laisvas{' '}
                          {selectedSendShipment.dydis.toUpperCase()} dydzio skyrius.
                        </p>
                      ) : (
                        <p className="terminal-copy">Pasirinkite siunta, kad galetume atidaryti pirma laisva skyriu.</p>
                      )}

                      <div className="form-actions">
                        <button
                          className="secondary-button"
                          disabled={isBusy || !selectedSendShipment || lockerState?.aktyviSesija !== null}
                          type="button"
                          onClick={() => {
                            if (!selectedSendShipment) {
                              return;
                            }

                            void handleLockerAction(
                              () => openSendLocker(selectedSendShipment.siuntosKodas),
                              'Nepavyko atidaryti laisvo skyriaus.',
                            );
                          }}
                        >
                          Atidaryti pirma laisva skyriu
                        </button>
                        <button
                          className="primary-button"
                          disabled={
                            isBusy ||
                            lockerState?.aktyviSesija?.veiksmas !== 'idejimas' ||
                            !lockerState.aktyviSesija.durelesAtidarytos
                          }
                          type="button"
                          onClick={() =>
                            void handleLockerAction(
                              () => closeLockerDoors(),
                              'Nepavyko uzdaryti duru po idejimo.',
                            )
                          }
                        >
                          Uzdaryti duris
                        </button>
                      </div>
                    </>
                  ) : null}

                  {serviceAction === 'deliver' ? (
                    <>
                      <select value={deliverCode} onChange={(event) => setDeliverCode(event.target.value)}>
                        <option value="">Pasirinkite ideta siunta</option>
                        {readyForDelivery.map((shipment) => (
                          <option key={shipment.id} value={shipment.siuntosKodas}>
                            {shipment.siuntosKodas}
                          </option>
                        ))}
                      </select>
                      <p className="terminal-copy">
                        Siuo veiksmu siunta pazymima kaip pristatyta i gavimo pastomata.
                      </p>
                      <button
                        className="primary-button"
                        disabled={isBusy || !selectedDeliverShipment}
                        type="button"
                        onClick={() => {
                          if (!selectedDeliverShipment) {
                            return;
                          }

                          void handleLockerAction(
                            () => deliverToPickupLocker(selectedDeliverShipment.siuntosKodas),
                            'Nepavyko pazymeti siuntos kaip pristatytos.',
                          );
                        }}
                      >
                        Pazymeti kaip pristatyta
                      </button>
                    </>
                  ) : null}

                  {serviceAction === 'pickup' ? (
                    <>
                      <select value={pickupCode} onChange={(event) => setPickupCode(event.target.value)}>
                        <option value="">Pasirinkite pristatyta siunta</option>
                        {readyForPickup.map((shipment) => (
                          <option key={shipment.id} value={shipment.siuntosKodas}>
                            {shipment.siuntosKodas}
                          </option>
                        ))}
                      </select>
                      <div className="form-actions">
                        <button
                          className="secondary-button"
                          disabled={isBusy || !selectedPickupShipment || lockerState?.aktyviSesija !== null}
                          type="button"
                          onClick={() => {
                            if (!selectedPickupShipment) {
                              return;
                            }

                            void handleLockerAction(
                              () => openPickupLocker(selectedPickupShipment.siuntosKodas),
                              'Nepavyko atidaryti skyriaus atsiemimui.',
                            );
                          }}
                        >
                          Atidaryti duris
                        </button>
                        <button
                          className="primary-button"
                          disabled={
                            isBusy ||
                            lockerState?.aktyviSesija?.veiksmas !== 'atsiemimas' ||
                            !lockerState.aktyviSesija.durelesAtidarytos
                          }
                          type="button"
                          onClick={() =>
                            void handleLockerAction(
                              () => closeLockerDoors(),
                              'Nepavyko uzdaryti duru po atsiemimo.',
                            )
                          }
                        >
                          Uzdaryti duris
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              {lockerState ? (
                <div className="locker-terminal-cells">
                  {lockerState.skyriai.map((cell) => (
                    <article
                      className={`locker-cell ${cell.uzimtas ? 'occupied' : 'free'} ${
                        cell.durelesAtidarytos ? 'open' : ''
                      }`}
                      key={cell.id}
                    >
                      <strong>{cell.numeris}</strong>
                      <span>{cell.dydis.toUpperCase()}</span>
                      <small>{cell.siuntosKodas ?? 'Laisvas'}</small>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
