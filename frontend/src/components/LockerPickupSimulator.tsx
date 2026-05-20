import { useEffect, useState } from 'react';

import {
  closeLockerDoors,
  fetchLockerState,
  openPickupLocker,
  openDropoffLocker,
  closeDropoffLocker,
} from '../api/lockerPickupApi';
import { fetchCourierLockers, type CourierLockerListItem } from '../api/courierLockerApi';
import type { DemoLockerState } from '../models/locker';

type TerminalMode = 'pickup' | 'dropoff';

type LockerPickupSimulatorProps = {
  onError: (message: string) => void;
};

export function LockerPickupSimulator({ onError }: LockerPickupSimulatorProps) {
  const [lockers, setLockers] = useState<CourierLockerListItem[]>([]);
  const [selectedLockerId, setSelectedLockerId] = useState<number>();
  const [lockerState, setLockerState] = useState<DemoLockerState>();
  const [shipmentCode, setShipmentCode] = useState('');
  const [terminalMode, setTerminalMode] = useState<TerminalMode>('dropoff');
  const [message, setMessage] = useState('Select a locker and enter the parcel code.');
  const [isBusy, setIsBusy] = useState(false);

  const loadLockers = async () => {
    try {
      const items = await fetchCourierLockers();
      setLockers(items);
      if (items.length > 0) setSelectedLockerId(items[0].id);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to load lockers.');
    }
  };

  const loadLockerState = async (lockerId: number) => {
    try {
      setLockerState(await fetchLockerState(lockerId));
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to load locker state.');
    }
  };

  useEffect(() => { void loadLockers(); }, []);

  useEffect(() => {
    if (selectedLockerId !== undefined) {
      setLockerState(undefined);
      setShipmentCode('');
      setMessage(terminalMode === 'dropoff'
        ? 'Enter the parcel code to drop off.'
        : 'Enter the parcel pickup code from the notification.');
      void loadLockerState(selectedLockerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLockerId, terminalMode]);

  const handleOpenDoor = async () => {
    if (!selectedLockerId) return;
    const code = shipmentCode.trim();
    if (code.length < 3) { onError('Enter a valid parcel code.'); return; }
    setIsBusy(true);
    try {
      const result = terminalMode === 'dropoff'
        ? await openDropoffLocker(selectedLockerId, code)
        : await openPickupLocker(selectedLockerId, code);
      setLockerState(result.locker);
      setMessage(result.message);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to open locker cell.');
    } finally { setIsBusy(false); }
  };

  const handleCloseDoor = async () => {
    if (!selectedLockerId) return;
    setIsBusy(true);
    try {
      const result = terminalMode === 'dropoff'
        ? await closeDropoffLocker(selectedLockerId)
        : await closeLockerDoors(selectedLockerId);
      setLockerState(result.locker);
      setMessage(result.message);
      setShipmentCode('');
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : 'Failed to close locker door.');
    } finally { setIsBusy(false); }
  };

  const activeSession = lockerState?.activeSession;
  const isSessionOpen = activeSession?.doorOpen === true;
  const sessionMatchesMode =
    (terminalMode === 'dropoff' && activeSession?.action === 'idejimas') ||
    (terminalMode === 'pickup' && activeSession?.action === 'atsiemimas');
  const canOpenDoor = !isSessionOpen && shipmentCode.trim().length >= 3 && !activeSession;
  const canCloseDoor = isSessionOpen && sessionMatchesMode;

  return (
    <section className="locker-terminal-shell locker-terminal-shell-inline" aria-label="Locker terminal">
      <div className="locker-terminal-topbar">
        <div>
          <p className="eyebrow">Locker terminal</p>
          <h3>{terminalMode === 'dropoff' ? 'Drop off parcel' : 'Pick up parcel'}</h3>
        </div>
        {lockerState ? <span className="counter-badge">{lockerState.productCode}</span> : null}
      </div>

      <div className="locker-screen locker-screen-compact">
        <div className="locker-screen-header">
          <select
            className="locker-screen-select"
            value={selectedLockerId ?? ''}
            onChange={(e) => setSelectedLockerId(Number(e.target.value))}
            disabled={isBusy}
          >
            {lockers.map((l) => (
              <option key={l.id} value={l.id}>{l.address}</option>
            ))}
          </select>
          <select
            className="locker-screen-select"
            value={terminalMode}
            onChange={(e) => {
              setTerminalMode(e.target.value as TerminalMode);
              setShipmentCode('');
            }}
            disabled={isBusy || isSessionOpen}
          >
            <option value="dropoff">DROP OFF</option>
            <option value="pickup">PICKUP</option>
          </select>
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
              disabled={isBusy || !canOpenDoor}
              type="button"
              onClick={() => void handleOpenDoor()}
            >
              Open door
            </button>
            <button
              className="primary-button"
              disabled={isBusy || !canCloseDoor}
              type="button"
              onClick={() => void handleCloseDoor()}
            >
              {terminalMode === 'dropoff' ? 'Close door (confirm drop off)' : 'Close door (confirm pickup)'}
            </button>
          </div>
        </div>

        {lockerState ? (
          <div className="locker-terminal-cells">
            {lockerState.cells.map((cell) => (
              <article
                className={`locker-cell ${cell.occupied ? 'occupied' : 'free'} ${cell.doorOpen ? 'open' : ''}`}
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