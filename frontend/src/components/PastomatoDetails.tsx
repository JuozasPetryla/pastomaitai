import type { Pastomatas } from '../models/pastomatas';

type PastomatoDetailsProps = {
  pastomatas?: Pastomatas;
};

export function PastomatoDetails({ pastomatas }: PastomatoDetailsProps) {
  if (!pastomatas) {
    return <p className="empty-state">Pasirinkite paštomatą informacijai peržiūrėti.</p>;
  }

  return (
    <article className="detail-panel">
      <header>
        <p>{pastomatas.busena}</p>
        <h3>{pastomatas.adresas}</h3>
      </header>

      <dl>
        <div>
          <dt>Produkto kodas</dt>
          <dd>{pastomatas.produktoKodas}</dd>
        </div>
        <div>
          <dt>Skyriai</dt>
          <dd>{pastomatas.skyriai.length}</dd>
        </div>
      </dl>

      <div className="compartment-list">
        {pastomatas.skyriai.map((skyrius) => (
          <span key={skyrius.id}>
            {skyrius.numeris} · {skyrius.dydis.toUpperCase()}
          </span>
        ))}
      </div>
    </article>
  );
}
