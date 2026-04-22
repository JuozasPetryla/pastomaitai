import type { LockerListItem } from '../models/pastomatas';

type LockerListProps = {
  activeId?: number;
  items: LockerListItem[];
  onSelect: (id: number) => void;
};

export function LockerList({ activeId, items, onSelect }: LockerListProps) {
  if (items.length === 0) {
    return <p className="empty-state">No lockers match the current filters.</p>;
  }

  return (
    <div className="locker-list">
      {items.map((locker) => (
        <button
          key={locker.id}
          className={locker.id === activeId ? 'active' : ''}
          type="button"
          onClick={() => onSelect(locker.id)}
        >
          <span>{locker.address}</span>
          <small>
            {locker.status} · {locker.cellCount} cells
          </small>
        </button>
      ))}
    </div>
  );
}
