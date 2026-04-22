import type { ShipmentListItem, ShipmentStatus } from '../models/shipment';

const statusLabels: Record<ShipmentStatus, string> = {
  parengta: 'Parengta',
  apmoketa: 'Apmoketa',
  uzregistruota: 'Uzregistruota',
  ideta: 'Ideta',
  tranzite: 'Tranzite',
  pristatyta: 'Pristatyta',
  atsiimta: 'Atsiimta',
  atsaukta: 'Atsaukta',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('lt-LT');
}

type ShipmentListProps = {
  activeId?: number;
  items: ShipmentListItem[];
  onSelect: (id: number) => void;
};

export function ShipmentList({ activeId, items, onSelect }: ShipmentListProps) {
  if (items.length === 0) {
    return <p className="empty-state">Siuntu pagal pasirinktus filtrus nera.</p>;
  }

  return (
    <div className="locker-list">
      {items.map((shipment) => (
        <button
          key={shipment.id}
          className={shipment.id === activeId ? 'active' : ''}
          type="button"
          onClick={() => onSelect(shipment.id)}
        >
          <span>
            {shipment.siuntosKodas} · {shipment.siuntejas}
          </span>
          <small>
            {statusLabels[shipment.busena]} · {shipment.dydis.toUpperCase()} ·{' '}
            {formatDate(shipment.createdAt)}
          </small>
        </button>
      ))}
    </div>
  );
}
