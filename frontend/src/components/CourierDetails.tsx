import type { Courier } from '../models/courier';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('lt-LT', {
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
    return <p className="empty-state">Pasirinkite kurjeri informacijai perziureti.</p>;
  }

  return (
    <article className="detail-panel">
      <header>
        <p>{courier.pareigos}</p>
        <h3>
          {courier.vardas} {courier.pavarde}
        </h3>
      </header>

      <dl>
        <div>
          <dt>Telefono numeris</dt>
          <dd>{courier.telefonoNr}</dd>
        </div>
        <div>
          <dt>El. pastas</dt>
          <dd>{courier.elPastas}</dd>
        </div>
        <div>
          <dt>Sukurta</dt>
          <dd>{formatDate(courier.createdAt)}</dd>
        </div>
        <div>
          <dt>Atnaujinta</dt>
          <dd>{formatDate(courier.updatedAt)}</dd>
        </div>
      </dl>
    </article>
  );
}
