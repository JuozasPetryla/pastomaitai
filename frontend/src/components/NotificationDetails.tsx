import type { Notification } from '../models/notification';

type NotificationDetailsProps = {
  notification?: Notification;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationDetails({ notification }: NotificationDetailsProps) {
  if (!notification) {
    return <p className="empty-state">Select a notification to view details.</p>;
  }

  return (
    <article className="detail-panel">
      <header>
        <p>{notification.isSent ? 'Sent' : 'Not sent'}</p>
        <h3>{notification.type === 'sms' ? 'SMS' : 'Email'} · Person #{notification.personId}</h3>
      </header>

      <dl>
        <div>
          <dt>Message</dt>
          <dd>{notification.message}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(notification.createdAt)}</dd>
        </div>
        <div>
          <dt>Sent to provider</dt>
          <dd>{formatDate(notification.sentToProviderAt)}</dd>
        </div>
        <div>
          <dt>Provider response</dt>
          <dd>{formatDate(notification.providerResponseAt)}</dd>
        </div>
      </dl>
    </article>
  );
}
