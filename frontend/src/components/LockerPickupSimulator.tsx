import { useEffect, useState } from 'react';

import {
  closeLockerDoors,
  fetchDemoLockerState,
  openPickupLocker,
} from '../api/lockerPickupApi';
import type { DemoLockerState } from '../models/locker';

type LockerPickupSimulatorProps = {
  onError: (message: string) => void;
};

export function LockerPickupSimulator({ onError }: LockerPickupSimulatorProps) {
  const [lockerState, setLockerState] = useState<DemoLockerState>();
  const [shipmentCode, setShipmentCode] = useState('');
  const [message, setMessage] = useState('Enter the parcel pickup code from the notification.');
  const [isBusy, setIsBusy] = useState(false);

  const loadPickupData = async () => {
    try {
      setLockerState(await fetchDemoLockerState());
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to load locker pickup data.');
    }
  };

  const OpenPickupLocker = async () => {
    const code = shipmentCode.trim();
    if (code.length < 3) {
      onError('Enter a valid parcel pickup code.');
      return;
    }

    setIsBusy(true);
    try {
      const result = await openPickupLocker(code);
      setLockerState(result.locker);
      setMessage(result.message);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to open locker cell.');
    } finally {
      setIsBusy(false);
    }
  };

  const CloseLockerDoors = async () => {
    setIsBusy(true);
    try {
      const result = await closeLockerDoors();
      setLockerState(result.locker);
      setMessage(result.message);
      setShipmentCode('');
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to close locker doors.');
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    void loadPickupData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canCloseDoors =
    lockerState?.activeSession?.action === 'atsiemimas' && lockerState.activeSession.doorOpen;

  return (
    <section className="locker-terminal-shell locker-terminal-shell-inline" aria-label="Locker pickup simulator">
      <div className="locker-terminal-topbar">
        <div>
          <p className="eyebrow">Locker terminal</p>
          <h3>Pick up parcel</h3>
        </div>
        {lockerState ? <span className="counter-badge">{lockerState.productCode}</span> : null}
      </div>

      <div className="locker-screen locker-screen-compact">
        <div className="locker-screen-header">
          <span>{lockerState?.address ?? 'Loading locker...'}</span>
          <strong>PICKUP</strong>
        </div>

        <div className="terminal-panel">
          <p className="terminal-copy">{message}</p>
          <input
            value={shipmentCode}
            placeholder="Parcel code"
            onChange={(event) => setShipmentCode(event.target.value)}
          />

          <div className="form-actions">
            <button
              className="secondary-button"
              disabled={isBusy || shipmentCode.trim().length < 3 || lockerState?.activeSession !== null}
              type="button"
              onClick={() => void OpenPickupLocker()}
            >
              Open doors
            </button>
            <button
              className="primary-button"
              disabled={isBusy || !canCloseDoors}
              type="button"
              onClick={() => void CloseLockerDoors()}
            >
              Close doors
            </button>
          </div>
        </div>

        {lockerState ? (
          <div className="locker-terminal-cells">
            {lockerState.cells.map((cell) => (
              <article
                className={`locker-cell ${cell.occupied ? 'occupied' : 'free'} ${
                  cell.doorOpen ? 'open' : ''
                }`}
                key={cell.id}
              >
                <strong>{cell.number}</strong>
                <span>{cell.size.toUpperCase()}</span>
                <small>{cell.shipmentCode ?? 'Free'}</small>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
