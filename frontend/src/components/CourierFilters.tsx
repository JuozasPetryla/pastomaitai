import type { CourierFilters as CourierFiltersType, CourierRole } from '../models/courier';

const roles: Array<{ value: CourierRole | ''; label: string }> = [
  { value: '', label: 'All roles' },
  { value: 'courier', label: 'Courier' },
  { value: 'administrator', label: 'Administrator' },
];

type CourierFiltersProps = {
  filters: CourierFiltersType;
  onChange: (filters: CourierFiltersType) => void;
};

export function CourierFilters({ filters, onChange }: CourierFiltersProps) {
  return (
    <div className="filter-bar">
      <label>
        <span>Role</span>
        <select
          value={filters.role}
          onChange={(event) => onChange({ ...filters, role: event.target.value as CourierRole | '' })}
        >
          {roles.map((role) => (
            <option key={role.value || 'all'} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
