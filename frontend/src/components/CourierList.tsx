import type { CourierListItem } from '../models/courier';

type CourierListProps = {
  activeId?: number;
  items: CourierListItem[];
  onSelect: (id: number) => void;
};

export function CourierList({ activeId, items, onSelect }: CourierListProps) {
  if (items.length === 0) {
    return <p className="empty-state">Kurjeriu pagal pasirinktus filtrus nera.</p>;
  }

  return (
    <div className="locker-list">
      {items.map((courier) => (
        <button
          key={courier.id}
          className={courier.id === activeId ? 'active' : ''}
          type="button"
          onClick={() => onSelect(courier.id)}
        >
          <span>
            {courier.vardas} {courier.pavarde}
          </span>
          <small>
            {courier.pareigos} · {courier.telefonoNr}
          </small>
        </button>
      ))}
    </div>
  );
}
