import type { PranesimasListItem } from '../models/pranesimas';

type PranesimuListProps = {
  activeId?: number;
  items: PranesimasListItem[];
  onSelect: (id: number) => void;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('lt-LT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PranesimuList({ activeId, items, onSelect }: PranesimuListProps) {
  if (items.length === 0) {
    return <p className="empty-state">Pranešimų pagal pasirinktus filtrus nėra.</p>;
  }

  return (
    <div className="locker-list">
      {items.map((pranesimas) => (
        <button
          key={pranesimas.id}
          className={pranesimas.id === activeId ? 'active' : ''}
          type="button"
          onClick={() => onSelect(pranesimas.id)}
        >
          <span>
            {pranesimas.tipas === 'sms' ? 'SMS' : 'El. paštas'} · Asmuo #{pranesimas.asmuo_id}
          </span>
          <small>
            {pranesimas.issiustas ? '✓ Išsiųstas' : '○ Neišsiųstas'} · {formatDate(pranesimas.created_at)}
          </small>
        </button>
      ))}
    </div>
  );
}