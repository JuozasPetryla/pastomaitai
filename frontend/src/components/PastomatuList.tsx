import type { PastomatasListItem } from '../models/pastomatas';

type PastomatuListProps = {
  activeId?: number;
  items: PastomatasListItem[];
  onSelect: (id: number) => void;
};

export function PastomatuList({ activeId, items, onSelect }: PastomatuListProps) {
  if (items.length === 0) {
    return <p className="empty-state">Paštomatų pagal pasirinktus filtrus nėra.</p>;
  }

  return (
    <div className="locker-list">
      {items.map((pastomatas) => (
        <button
          key={pastomatas.id}
          className={pastomatas.id === activeId ? 'active' : ''}
          type="button"
          onClick={() => onSelect(pastomatas.id)}
        >
          <span>{pastomatas.adresas}</span>
          <small>
            {pastomatas.busena} · {pastomatas.skyriuSkaicius} skyr.
          </small>
        </button>
      ))}
    </div>
  );
}
