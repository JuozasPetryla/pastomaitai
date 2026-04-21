import type { PranesimoTipas, PranesimuFiltrai } from '../models/pranesimas';

const tipai: Array<{ value: PranesimoTipas | ''; label: string }> = [
  { value: '', label: 'Visi tipai' },
  { value: 'sms', label: 'SMS' },
  { value: 'el_pastas', label: 'El. paštas' },
];

const issiustoReikšmes: Array<{ value: 'true' | 'false' | ''; label: string }> = [
  { value: '', label: 'Visi' },
  { value: 'true', label: 'Išsiųsti' },
  { value: 'false', label: 'Neišsiųsti' },
];

type PranesimuFiltersProps = {
  filters: PranesimuFiltrai;
  onChange: (filters: PranesimuFiltrai) => void;
};

export function PranesimuFilters({ filters, onChange }: PranesimuFiltersProps) {
  return (
    <div className="filter-bar">
      <label>
        <span>Asmens ID</span>
        <input
          type="number"
          value={filters.asmuo_id}
          placeholder="Pvz.: 42"
          min={1}
          onChange={(event) => onChange({ ...filters, asmuo_id: event.target.value })}
        />
      </label>

      <label>
        <span>Tipas</span>
        <select
          value={filters.tipas}
          onChange={(event) =>
            onChange({ ...filters, tipas: event.target.value as PranesimoTipas | '' })
          }
        >
          {tipai.map((tipas) => (
            <option key={tipas.value || 'all'} value={tipas.value}>
              {tipas.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Išsiųstas</span>
        <select
          value={filters.issiustas}
          onChange={(event) =>
            onChange({ ...filters, issiustas: event.target.value as 'true' | 'false' | '' })
          }
        >
          {issiustoReikšmes.map((r) => (
            <option key={r.value || 'all'} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}