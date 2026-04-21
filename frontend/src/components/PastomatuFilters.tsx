import type { PastomatoBusena, PastomatuFiltrai } from '../models/pastomatas';

const busenos: Array<{ value: PastomatoBusena | ''; label: string }> = [
  { value: '', label: 'Visos būsenos' },
  { value: 'aktyvus', label: 'Aktyvus' },
  { value: 'neaktyvus', label: 'Neaktyvus' },
  { value: 'negali_spausdinti', label: 'Negali spausdinti' },
  { value: 'panaikintas', label: 'Panaikintas' },
];

type PastomatuFiltersProps = {
  filters: PastomatuFiltrai;
  onChange: (filters: PastomatuFiltrai) => void;
};

export function PastomatuFilters({ filters, onChange }: PastomatuFiltersProps) {
  return (
    <div className="filter-bar">
      <label>
        <span>Regionas</span>
        <input
          type="search"
          value={filters.regionas}
          placeholder="Adreso tekstas"
          onChange={(event) => onChange({ ...filters, regionas: event.target.value })}
        />
      </label>

      <label>
        <span>Būsena</span>
        <select
          value={filters.busena}
          onChange={(event) =>
            onChange({ ...filters, busena: event.target.value as PastomatoBusena | '' })
          }
        >
          {busenos.map((busena) => (
            <option key={busena.value || 'all'} value={busena.value}>
              {busena.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
