import type { CourierFilters as CourierFiltersType, CourierRole } from '../models/courier';

const roles: Array<{ value: CourierRole | ''; label: string }> = [
  { value: '', label: 'Visos pareigos' },
  { value: 'kurjeris', label: 'Kurjeris' },
  { value: 'administratorius', label: 'Administratorius' },
];

type CourierFiltersProps = {
  filters: CourierFiltersType;
  onChange: (filters: CourierFiltersType) => void;
};

export function CourierFilters({ filters, onChange }: CourierFiltersProps) {
  return (
    <div className="filter-bar">
      <label>
        <span>Pareigos</span>
        <select
          value={filters.pareigos}
          onChange={(event) =>
            onChange({ ...filters, pareigos: event.target.value as CourierRole | '' })
          }
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
