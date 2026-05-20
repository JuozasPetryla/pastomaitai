import type { CourierLockerListItem } from '../api/courierLockerApi';

type Props = {
  lockers: CourierLockerListItem[];
  selectedId: number | undefined;
  onSelect: (id: number) => void;
};

export function CourierLockerList({ lockers, selectedId, onSelect }: Props) {
  if (lockers.length === 0) {
    return <p className="empty-state">No active parcel machines found.</p>;
  }

  return (
    <ul className="item-list">
      {lockers.map((locker) => (
        <li key={locker.id}>
          <button
            className={`item-list-row ${locker.id === selectedId ? 'active' : ''}`}
            type="button"
            onClick={() => onSelect(locker.id)}
          >
            <span className="item-list-primary">{locker.address}</span>
            <span className="item-list-secondary">{locker.productCode}</span>
            <span className="item-list-meta">
              {locker.pendingTakeout > 0 && (
                <span className="badge badge-warning">↑ {locker.pendingTakeout}</span>
              )}
              {locker.pendingInsert > 0 && (
                <span className="badge badge-info">↓ {locker.pendingInsert}</span>
              )}
              {locker.pendingTakeout === 0 && locker.pendingInsert === 0 && (
                <span className="badge">OK</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}