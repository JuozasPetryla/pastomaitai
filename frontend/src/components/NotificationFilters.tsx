import type { NotificationFilters, NotificationType } from '../models/notification';

const notificationTypes: Array<{ value: NotificationType | ''; label: string }> = [
  { value: '', label: 'All types' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

const sentValues: Array<{ value: 'true' | 'false' | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Sent' },
  { value: 'false', label: 'Not sent' },
];

type NotificationFiltersProps = {
  filters: NotificationFilters;
  onChange: (filters: NotificationFilters) => void;
};

export function NotificationFilters({ filters, onChange }: NotificationFiltersProps) {
  return (
    <div className="filter-bar">
      <label>
        <span>Person ID</span>
        <input
          type="number"
          value={filters.personId}
          placeholder="Example: 42"
          min={1}
          onChange={(event) => onChange({ ...filters, personId: event.target.value })}
        />
      </label>

      <label>
        <span>Type</span>
        <select
          value={filters.type}
          onChange={(event) =>
            onChange({ ...filters, type: event.target.value as NotificationType | '' })
          }
        >
          {notificationTypes.map((type) => (
            <option key={type.value || 'all'} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Sent</span>
        <select
          value={filters.isSent}
          onChange={(event) =>
            onChange({ ...filters, isSent: event.target.value as 'true' | 'false' | '' })
          }
        >
          {sentValues.map((value) => (
            <option key={value.value || 'all'} value={value.value}>
              {value.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
