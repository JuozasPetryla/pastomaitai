import type { ShipmentFilters as ShipmentFiltersType, ShipmentStatus } from '../models/shipment';

const statuses: Array<{ value: ShipmentStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'prepared', label: 'Prepared' },
  { value: 'paid', label: 'Paid' },
  { value: 'registered', label: 'Registered' },
  { value: 'inserted', label: 'Inserted' },
  { value: 'in_transit', label: 'In transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'collected', label: 'Collected' },
  { value: 'cancelled', label: 'Cancelled' },
];

type ShipmentFiltersProps = {
  filters: ShipmentFiltersType;
  onChange: (filters: ShipmentFiltersType) => void;
};

export function ShipmentFilters({ filters, onChange }: ShipmentFiltersProps) {
  return (
    <div className="filter-bar">
      <label>
        <span>Shipment code</span>
        <input
          type="search"
          value={filters.shipmentCode}
          placeholder="Example: SNT-001001"
          onChange={(event) => onChange({ ...filters, shipmentCode: event.target.value })}
        />
      </label>

      <label>
        <span>Status</span>
        <select
          value={filters.status}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as ShipmentStatus | '' })
          }
        >
          {statuses.map((status) => (
            <option key={status.value || 'all'} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
