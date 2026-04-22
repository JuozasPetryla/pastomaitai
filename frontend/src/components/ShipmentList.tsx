import type { ShipmentListItem, ShipmentStatus } from '../models/shipment';

const statusLabels: Record<ShipmentStatus, string> = {
  prepared: 'Prepared',
  paid: 'Paid',
  registered: 'Registered',
  inserted: 'Inserted',
  in_transit: 'In transit',
  delivered: 'Delivered',
  collected: 'Collected',
  cancelled: 'Cancelled',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB');
}

type ShipmentListProps = {
  activeId?: number;
  items: ShipmentListItem[];
  onSelect: (id: number) => void;
};

export function ShipmentList({ activeId, items, onSelect }: ShipmentListProps) {
  if (items.length === 0) {
    return <p className="empty-state">No shipments match the current filters.</p>;
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
            {shipment.shipmentCode} · {shipment.sender}
          </span>
          <small>
            {statusLabels[shipment.status]} · {shipment.size.toUpperCase()} ·{' '}
            {formatDate(shipment.createdAt)}
          </small>
        </button>
      ))}
    </div>
  );
}
