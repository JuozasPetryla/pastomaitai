import { useEffect, useState } from 'react';
import {
  fetchLockerContents,
  courierOpenTakeout,
  courierCloseTakeout,
  courierOpenInsert,
  courierCloseInsert,
  type CourierLockerContents,
  type CourierLockerActionResult,
} from '../api/courierLockerApi';
import type { DemoLockerState } from '../models/locker';
import type { Shipment } from '../models/shipment';


type Mode = 'overview' | 'takeout' | 'insert';


type Props = {
  lockerId: number;
  onError: (message: string) => void;
};


export function CourierLockerTerminal({ lockerId, onError }: Props) {
  const [contents, setContents] = useState<CourierLockerContents>();
  const [mode, setMode] = useState<Mode>('overview');
  const [message, setMessage] = useState('Loading parcel machine contents...');
  const [isBusy, setIsBusy] = useState(false);
  const [shipmentCode, setShipmentCode] = useState('');
  const [activeDestination, setActiveDestination] = useState<string>();


  const load = async () => {
    try {
      const data = await fetchLockerContents(lockerId);
      setContents(data);
      setMessage('Select an action: unload (take out) or load (insert) parcels.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load locker contents.');
    }
  };


  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockerId]);


  const applyResult = (result: CourierLockerActionResult, nextMessage: string) => {
    setMessage(result.message || nextMessage);
    void load();
  };


  // ── Takeout flow ──────────────────────────────────────────────────────────


  const handleOpenTakeout = async () => {
    const code = shipmentCode.trim();
    if (code.length < 3) { onError('Enter a valid parcel code.'); return; }
    // Save destination before load() clears the queue
    const destination = contents?.shipmentsForTakeout.find(
      (s) => s.shipmentCode === code,
    )?.destinationAddress;
    setActiveDestination(destination);
    setIsBusy(true);
    try {
      const result = await courierOpenTakeout(lockerId, code);
      applyResult(result, 'Cell opened. Take out the parcel, then close the door.');
    } catch (err) {
      setActiveDestination(undefined);
      onError(err instanceof Error ? err.message : 'Failed to open cell for takeout.');
    } finally { setIsBusy(false); }
  };


  const handleCloseTakeout = async () => {
    setIsBusy(true);
    try {
      const result = await courierCloseTakeout(lockerId);
      setShipmentCode('');
      setActiveDestination(undefined);
      applyResult(result, 'Door closed. Shipment is now in transit.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to close door after takeout.');
    } finally { setIsBusy(false); }
  };


  // ── Insert flow ───────────────────────────────────────────────────────────


  const handleOpenInsert = async () => {
    const code = shipmentCode.trim();
    if (code.length < 3) { onError('Enter a valid parcel code.'); return; }
    setIsBusy(true);
    try {
      const result = await courierOpenInsert(lockerId, code);
      applyResult(result, 'Cell opened. Place the parcel inside, then close the door.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to open cell for insert.');
    } finally { setIsBusy(false); }
  };


  const handleCloseInsert = async () => {
    setIsBusy(true);
    try {
      const result = await courierCloseInsert(lockerId);
      setShipmentCode('');
      applyResult(result, 'Door closed. Shipment delivered. Receiver notified.');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to close door after insert.');
    } finally { setIsBusy(false); }
  };


  const locker = contents?.locker;
  const activeSession = locker?.activeSession;
  const isSessionOpen = activeSession?.doorOpen === true;
  const sessionMode = activeSession
    ? activeSession.action === 'iskrovimas'
      ? 'takeout'
      : activeSession.action === 'pakrovimas'
      ? 'insert'
      : null
    : null;


  const canOpenDoor = !isSessionOpen && shipmentCode.trim().length >= 3;
  const canCloseTakeout = isSessionOpen && sessionMode === 'takeout';
  const canCloseInsert = isSessionOpen && sessionMode === 'insert';


  return (
    <div className="courier-terminal">
      <div className="courier-terminal-tabs">
        <button
          className={mode === 'overview' ? 'active' : ''}
          type="button"
          onClick={() => setMode('overview')}
        >
          Overview
        </button>
        <button
          className={mode === 'takeout' ? 'active' : ''}
          type="button"
          onClick={() => setMode('takeout')}
        >
          Unload{' '}
          {contents && contents.shipmentsForTakeout.length > 0 && (
            <span className="badge badge-warning">{contents.shipmentsForTakeout.length}</span>
          )}
        </button>
        <button
          className={mode === 'insert' ? 'active' : ''}
          type="button"
          onClick={() => setMode('insert')}
        >
          Load{' '}
          {contents && contents.shipmentsForInsert.length > 0 && (
            <span className="badge badge-info">{contents.shipmentsForInsert.length}</span>
          )}
        </button>
      </div>


      <p className="workflow-status">{message}</p>


      {activeSession && (
        <div className={`session-banner ${sessionMode ?? ''}`}>
          <strong>
            {sessionMode === 'takeout' ? '↑ Unloading' : '↓ Loading'}:{' '}
          </strong>
          {activeSession.shipmentCode} — Cell #{activeSession.cellNumber}
          {isSessionOpen ? ' 🔓 Door open' : ' 🔒 Door closed'}
          {sessionMode === 'takeout' && activeDestination && (
            <span className="session-destination"> → {activeDestination}</span>
          )}
        </div>
      )}


      {mode === 'overview' && locker && (
        <div className="locker-terminal-cells">
          {locker.cells.map((cell) => (
            <article
              className={`locker-cell ${cell.occupied ? 'occupied' : 'free'} ${cell.doorOpen ? 'open' : ''}`}
              key={cell.id}
            >
              <strong>{cell.number}</strong>
              <span>{cell.size.toUpperCase()}</span>
              <small>{cell.shipmentCode ?? 'Free'}</small>
              {cell.shipmentStatus && (
                <span className="cell-status">{cell.shipmentStatus}</span>
              )}
            </article>
          ))}
        </div>
      )}


      {mode === 'takeout' && (
        <div className="terminal-panel">
          <ShipmentQueue
            label="Parcels to unload (ideta → tranzite)"
            shipments={contents?.shipmentsForTakeout ?? []}
            onSelect={setShipmentCode}
          />
          <div className="form-row">
            <input
              value={shipmentCode}
              placeholder="Parcel code"
              onChange={(e) => setShipmentCode(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={isBusy || !canOpenDoor || isSessionOpen}
              onClick={() => void handleOpenTakeout()}
            >
              Open door
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={isBusy || !canCloseTakeout}
              onClick={() => void handleCloseTakeout()}
            >
              Close door (confirm takeout)
            </button>
          </div>
        </div>
      )}


      {mode === 'insert' && (
        <div className="terminal-panel">
          <ShipmentQueue
            label="Parcels to load (uzregistruota → pristatyta)"
            shipments={contents?.shipmentsForInsert ?? []}
            onSelect={setShipmentCode}
          />
          <div className="form-row">
            <input
              value={shipmentCode}
              placeholder="Parcel code"
              onChange={(e) => setShipmentCode(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={isBusy || !canOpenDoor || isSessionOpen}
              onClick={() => void handleOpenInsert()}
            >
              Open door
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={isBusy || !canCloseInsert}
              onClick={() => void handleCloseInsert()}
            >
              Close door (confirm delivery)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


type QueueProps = {
  label: string;
  shipments: Shipment[];
  onSelect: (code: string) => void;
};


function ShipmentQueue({ label, shipments, onSelect }: QueueProps) {
  if (shipments.length === 0) {
    return <p className="empty-state">No parcels pending.</p>;
  }


  return (
    <div className="shipment-queue">
      <p className="queue-label">{label}</p>
      <ul className="item-list">
        {shipments.map((s) => (
          <li key={s.id}>
            <button
              className="item-list-row"
              type="button"
              onClick={() => onSelect(s.shipmentCode)}
            >
              <span className="item-list-primary">{s.shipmentCode}</span>
              <span className="item-list-secondary">{s.size.toUpperCase()}</span>
              <span className="item-list-meta">→ {s.destinationAddress}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}