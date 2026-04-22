import type { Locker } from '../models/locker';

const statusLabels = {
  active: 'Active',
  inactive: 'Inactive',
  printing_disabled: 'Printing disabled',
  deleted: 'Deleted',
} as const;

type LockerDetailsProps = {
  locker?: Locker;
};

export function LockerDetails({ locker }: LockerDetailsProps) {
  if (!locker) {
    return <p className="empty-state">Select a locker to view details.</p>;
  }

  return (
    <article className="detail-panel">
      <header>
        <p>{statusLabels[locker.status]}</p>
        <h3>{locker.address}</h3>
      </header>

      <dl>
        <div>
          <dt>Product code</dt>
          <dd>{locker.productCode}</dd>
        </div>
        <div>
          <dt>Cells</dt>
          <dd>{locker.cells.length}</dd>
        </div>
      </dl>

      <div className="compartment-list">
        {locker.cells.map((cell) => (
          <span key={cell.id}>
            {cell.number} · {cell.size.toUpperCase()}
          </span>
        ))}
      </div>
    </article>
  );
}
