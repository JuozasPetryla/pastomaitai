import type { Courier } from '../models/courier';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type CourierDetailsProps = {
  courier?: Courier;
};

export function CourierDetails({ courier }: CourierDetailsProps) {
  if (!courier) {
    return <p className="empty-state">Select a courier to view details.</p>;
  }

  return (
    <article className="detail-panel">
      <header>
        <p>{courier.role}</p>
        <h3>
          {courier.firstName} {courier.lastName}
        </h3>
      </header>

      <dl>
        <div>
          <dt>Phone number</dt>
          <dd>{courier.phoneNumber}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{courier.email}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(courier.createdAt)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{formatDate(courier.updatedAt)}</dd>
        </div>
      </dl>
    </article>
  );
}
