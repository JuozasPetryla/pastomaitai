import type { NotificationListItem } from '../models/pranesimas';

type NotificationListProps = {
  activeId?: number;
  items: NotificationListItem[];
  onSelect: (id: number) => void;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationList({ activeId, items, onSelect }: NotificationListProps) {
  if (items.length === 0) {
    return <p className="empty-state">No notifications match the current filters.</p>;
  }

  return (
    <div className="locker-list">
      {items.map((notification) => (
        <button
          key={notification.id}
          className={notification.id === activeId ? 'active' : ''}
          type="button"
          onClick={() => onSelect(notification.id)}
        >
          <span>
            {notification.type === 'sms' ? 'SMS' : 'Email'} · Person #{notification.personId}
          </span>
          <small>
            {notification.isSent ? 'Sent' : 'Not sent'} · {formatDate(notification.createdAt)}
          </small>
        </button>
      ))}
    </div>
  );
}
