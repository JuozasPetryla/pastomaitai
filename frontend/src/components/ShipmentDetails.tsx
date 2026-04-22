import type { Shipment, ShipmentStatus } from '../models/shipment';

const statusLabels: Record<ShipmentStatus, string> = {
  parengta: 'Parengta',
  apmoketa: 'Apmoketa',
  uzregistruota: 'Uzregistruota',
  ideta: 'Ideta',
  tranzite: 'Tranzite',
  pristatyta: 'Pristatyta',
  atsiimta: 'Atsiimta',
  atsaukta: 'Atsaukta',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('lt-LT');
}

type ShipmentDetailsProps = {
  shipment?: Shipment;
};

export function ShipmentDetails({ shipment }: ShipmentDetailsProps) {
  if (!shipment) {
    return <p className="empty-state">Pasirinkite siunta informacijai perziureti.</p>;
  }

  return (
    <article className="detail-panel">
      <header>
        <p>{statusLabels[shipment.busena]}</p>
        <h3>{shipment.siuntosKodas}</h3>
      </header>

      <dl>
        <div>
          <dt>Uzsakymo numeris</dt>
          <dd>{shipment.uzsakymoNr}</dd>
        </div>
        <div>
          <dt>Siuntejas</dt>
          <dd>
            {shipment.siuntejas.vardas} {shipment.siuntejas.pavarde}
          </dd>
        </div>
        <div>
          <dt>Gavejas</dt>
          <dd>
            {shipment.gavejas.vardas} {shipment.gavejas.pavarde}
          </dd>
        </div>
        <div>
          <dt>Siuntimo adresas</dt>
          <dd>{shipment.siuntimoAdresas}</dd>
        </div>
        <div>
          <dt>Gavimo adresas</dt>
          <dd>{shipment.gavimoAdresas}</dd>
        </div>
        <div>
          <dt>Dydis</dt>
          <dd>{shipment.dydis.toUpperCase()}</dd>
        </div>
        <div>
          <dt>Suma</dt>
          <dd>{shipment.suma.toFixed(2)} EUR</dd>
        </div>
        <div>
          <dt>Apmokejimas</dt>
          <dd>{shipment.apmokamasPastomate ? 'Pastomate' : 'Internetu'}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{shipment.data}</dd>
        </div>
        <div>
          <dt>Sukurta</dt>
          <dd>{formatDate(shipment.createdAt)}</dd>
        </div>
        <div>
          <dt>Atnaujinta</dt>
          <dd>{formatDate(shipment.updatedAt)}</dd>
        </div>
      </dl>
    </article>
  );
}
