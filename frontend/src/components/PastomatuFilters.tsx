import type { LockerFilters, LockerStatus } from '../models/pastomatas';

const statuses: Array<{ value: LockerStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'printing_disabled', label: 'Printing disabled' },
  { value: 'deleted', label: 'Deleted' },
];

type LockerFiltersProps = {
  filters: LockerFilters;
  onChange: (filters: LockerFilters) => void;
};

export function LockerFilters({ filters, onChange }: LockerFiltersProps) {
  return (
    <div className="filter-bar">
      <label>
        <span>Region</span>
        <input
          type="search"
          value={filters.region}
          placeholder="Address text"
          onChange={(event) => onChange({ ...filters, region: event.target.value })}
        />
      </label>

      <label>
        <span>Status</span>
        <select
          value={filters.status}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as LockerStatus | '' })
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
