import type { ShipmentFilters as ShipmentFiltersType, ShipmentStatus } from '../models/shipment';

const statuses: Array<{ value: ShipmentStatus | ''; label: string }> = [
  { value: '', label: 'Visos busenos' },
  { value: 'parengta', label: 'Parengta' },
  { value: 'apmoketa', label: 'Apmoketa' },
  { value: 'uzregistruota', label: 'Uzregistruota' },
  { value: 'ideta', label: 'Ideta' },
  { value: 'tranzite', label: 'Tranzite' },
  { value: 'pristatyta', label: 'Pristatyta' },
  { value: 'atsiimta', label: 'Atsiimta' },
  { value: 'atsaukta', label: 'Atsaukta' },
];

type ShipmentFiltersProps = {
  filters: ShipmentFiltersType;
  onChange: (filters: ShipmentFiltersType) => void;
};

export function ShipmentFilters({ filters, onChange }: ShipmentFiltersProps) {
  return (
    <div className="filter-bar">
      <label>
        <span>Siuntos kodas</span>
        <input
          type="search"
          value={filters.siuntosKodas}
          placeholder="Pvz.: SNT-001001"
          onChange={(event) => onChange({ ...filters, siuntosKodas: event.target.value })}
        />
      </label>

      <label>
        <span>Busena</span>
        <select
          value={filters.busena}
          onChange={(event) =>
            onChange({ ...filters, busena: event.target.value as ShipmentStatus | '' })
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
