import { type FormEvent, useEffect, useMemo, useState } from 'react';

import {
  closeLockerDoors,
  deliverToPickupLocker,
  fetchDemoLockerState,
  openPickupLocker,
  openSendLocker,
  payAtLocker,
  registerAtLocker,
} from '../api/lockerApi';
import type {
  LockerActionResult,
  LockerAddressOption,
  LockerRegistration,
  LockerState,
} from '../models/locker';
import type { Shipment, ShipmentPartyInput } from '../models/shipment';

type LockerViewProps = {
  lockerOptions: LockerAddressOption[];
  refreshToken: number;
  shipments: Shipment[];
  onShipmentUpsert: (shipment: Shipment) => void;
};

type TerminalScreen = 'home' | 'register' | 'pay' | 'send' | 'deliver' | 'pickup';

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

const emptyRegistration = (): LockerRegistration => ({
  siuntejas: emptyParty(),
  gavejas: emptyParty(),
  dydis: 'm',
  gavimoAdresas: '',
  siuntimoAdresas: '',
  data: new Date().toISOString().slice(0, 10),
});

function buildPaymentSummary(shipment: Shipment): string {
  return shipment.saskaita ?? `MOKEJIMAS-${shipment.siuntosKodas}`;
}

export function LockerView({
  lockerOptions,
  refreshToken,
  shipments,
  onShipmentUpsert,
}: LockerViewProps) {
  const [lockerState, setLockerState] = useState<LockerState | null>(null);
  const [screen, setScreen] = useState<TerminalScreen>('home');
  const [registration, setRegistration] = useState<LockerRegistration>(emptyRegistration);
  const [lockerPaymentCode, setLockerPaymentCode] = useState('');
  const [sendCode, setSendCode] = useState('');
  const [sendCellId, setSendCellId] = useState<number | null>(null);
  const [deliverCode, setDeliverCode] = useState('');
  const [pickupCode, setPickupCode] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
  const availableCells = useMemo(() => {
    if (!lockerState || !selectedSendShipment) {
      return [];
    }

    return lockerState.skyriai.filter(
      (cell) => !cell.uzimtas && cell.dydis === selectedSendShipment.dydis,
    );
  }, [lockerState, selectedSendShipment]);

  useEffect(() => {
    let isMounted = true;

    const loadLockerState = async () => {
      try {
        const nextState = await fetchDemoLockerState();
        if (isMounted) {
          setLockerState(nextState);
          setRegistration((current) => ({
            ...current,
            siuntimoAdresas: nextState.adresas,
            gavimoAdresas: current.gavimoAdresas || lockerOptions[0]?.adresas || nextState.adresas,
          }));
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : 'Nepavyko gauti pastomato bukles.');
        }
      }
    };

    void loadLockerState();

    return () => {
      isMounted = false;
    };
  }, [lockerOptions, refreshToken]);

  useEffect(() => {
    setSendCellId(null);
  }, [sendCode]);

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
        onShipmentUpsert(result.siunta);
      }
      setMessage(result.zinute);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : fallbackMessage);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRegistrationSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleLockerAction(
      async () => {
        const result = await registerAtLocker(registration);
        setRegistration((current) => ({
          ...emptyRegistration(),
          siuntimoAdresas: current.siuntimoAdresas,
          gavimoAdresas: lockerOptions[0]?.adresas || current.siuntimoAdresas,
        }));
        setScreen('pay');
        return result;
      },
      'Nepavyko uzregistruoti siuntos pastomate.',
    );
  };

  return (
    <aside className="locker-terminal" aria-labelledby="locker-title">
      <div className="locker-terminal-shell">
        <div className="locker-terminal-topbar">
          <div>
            <p className="eyebrow">LockerView</p>
            <h3 id="locker-title">Pastomato simuliacija</h3>
          </div>
          {lockerState ? <span className="counter-badge">{lockerState.produktoKodas}</span> : null}
        </div>

        <div className="locker-terminal-body">
          <div className="locker-screen">
            <div className="locker-screen-header">
              <span>{lockerState?.adresas ?? 'Kraunamas pastomatas...'}</span>
              <strong>{screen.toUpperCase()}</strong>
            </div>

            {error ? <p className="feedback feedback-error">{error}</p> : null}
            {message ? <p className="feedback feedback-success">{message}</p> : null}

            {screen === 'home' ? (
              <div className="terminal-panel">
                <h4>Pastomato bukle</h4>
                <p className="terminal-copy">
                  {lockerState?.aktyviSesija
                    ? `Atidarytas ${lockerState.aktyviSesija.skyriausNumeris} skyrius (${lockerState.aktyviSesija.veiksmas}).`
                    : 'Visos dureles uzdarytos. Pasirinkite veiksma desineje.'}
                </p>
                <div className="terminal-stats">
                  <div>
                    <span>Laisvi skyriai</span>
                    <strong>{lockerState?.skyriai.filter((cell) => !cell.uzimtas).length ?? 0}</strong>
                  </div>
                  <div>
                    <span>Siuntos pastomate</span>
                    <strong>{lockerState?.skyriai.filter((cell) => cell.uzimtas).length ?? 0}</strong>
                  </div>
                </div>
              </div>
            ) : null}

            {screen === 'register' ? (
              <form className="terminal-panel" onSubmit={handleRegistrationSubmit}>
                <h4>Registruoti paštomate</h4>
                <p className="terminal-copy">
                  Siuntimo pastomatas yra sis terminalas. Pasirinkite gavimo pastomata ir siuntos dydi.
                </p>
                <div className="terminal-form-grid">
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
                <button className="primary-button" disabled={isBusy} type="submit">
                  Registruoti siunta
                </button>
              </form>
            ) : null}

            {screen === 'pay' ? (
              <div className="terminal-panel">
                <h4>Apmoketi paštomate</h4>
                <select value={lockerPaymentCode} onChange={(event) => setLockerPaymentCode(event.target.value)}>
                  <option value="">Pasirink siunta</option>
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
                      <span>Kodas</span>
                      <strong>{buildPaymentSummary(selectedPaymentShipment)}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="terminal-copy">Pasirinkite registruota siunta ir sugeneruosime mokejimo duomenis.</p>
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
                  Patvirtinti mokejima
                </button>
              </div>
            ) : null}

            {screen === 'send' ? (
              <div className="terminal-panel">
                <h4>Siusti siunta</h4>
                <select value={sendCode} onChange={(event) => setSendCode(event.target.value)}>
                  <option value="">Pasirink apmoketa siunta</option>
                  {readyForSend.map((shipment) => (
                    <option key={shipment.id} value={shipment.siuntosKodas}>
                      {shipment.siuntosKodas}
                    </option>
                  ))}
                </select>

                {selectedSendShipment ? (
                  <>
                    <p className="terminal-copy">
                      Pirmiausia parodomi laisvi {selectedSendShipment.dydis.toUpperCase()} skyriai.
                    </p>
                    <div className="terminal-cells">
                      {availableCells.map((cell) => (
                        <button
                          key={cell.id}
                          className={`terminal-cell-button ${sendCellId === cell.id ? 'active' : ''}`}
                          type="button"
                          onClick={() => setSendCellId(cell.id)}
                        >
                          Skyrius {cell.numeris}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                <div className="form-actions">
                  <button
                    className="secondary-button"
                    disabled={isBusy || !selectedSendShipment || sendCellId === null || lockerState?.aktyviSesija !== null}
                    type="button"
                    onClick={() => {
                      if (!selectedSendShipment || sendCellId === null) {
                        return;
                      }

                      void handleLockerAction(
                        () => openSendLocker(selectedSendShipment.siuntosKodas, sendCellId),
                        'Nepavyko atidaryti pasirinkto skyriaus.',
                      );
                    }}
                  >
                    Atidaryti pasirinkta skyriu
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
              </div>
            ) : null}

            {screen === 'deliver' ? (
              <div className="terminal-panel">
                <h4>Pristatymo imitacija</h4>
                <select value={deliverCode} onChange={(event) => setDeliverCode(event.target.value)}>
                  <option value="">Pasirink ideta siunta</option>
                  {readyForDelivery.map((shipment) => (
                    <option key={shipment.id} value={shipment.siuntosKodas}>
                      {shipment.siuntosKodas}
                    </option>
                  ))}
                </select>
                <p className="terminal-copy">
                  Siuo veiksmu sistema pazymi, kad siunta pristatyta i gavimo pastomata.
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
              </div>
            ) : null}

            {screen === 'pickup' ? (
              <div className="terminal-panel">
                <h4>Atsiimti siunta</h4>
                <select value={pickupCode} onChange={(event) => setPickupCode(event.target.value)}>
                  <option value="">Pasirink pristatyta siunta</option>
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

          <div className="locker-hardware-buttons">
            <button
              className={screen === 'home' ? 'active' : ''}
              type="button"
              onClick={() => setScreen('home')}
            >
              Pagrindinis
            </button>
            <button
              className={screen === 'register' ? 'active' : ''}
              type="button"
              onClick={() => setScreen('register')}
            >
              Registruoti
            </button>
            <button
              className={screen === 'pay' ? 'active' : ''}
              type="button"
              onClick={() => setScreen('pay')}
            >
              Moketi
            </button>
            <button
              className={screen === 'send' ? 'active' : ''}
              type="button"
              onClick={() => setScreen('send')}
            >
              Siusti
            </button>
            <button
              className={screen === 'deliver' ? 'active' : ''}
              type="button"
              onClick={() => setScreen('deliver')}
            >
              Pristatyti
            </button>
            <button
              className={screen === 'pickup' ? 'active' : ''}
              type="button"
              onClick={() => setScreen('pickup')}
            >
              Atsiimti
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
