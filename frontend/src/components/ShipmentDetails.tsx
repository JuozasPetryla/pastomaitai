import type { Shipment, ShipmentStatus } from '../models/shipment';

const statusLabels: Record<ShipmentStatus, string> = {
  prepared: 'Prepared',
  paid: 'Paid',
  registered: 'Registered',
  inserted: 'Inserted',
  in_transit: 'In transit',
  delivered: 'Delivered',
  collected: 'Collected',
  cancelled: 'Cancelled',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB');
}

type ShipmentDetailsProps = {
  shipment?: Shipment;
};

export function ShipmentDetails({ shipment }: ShipmentDetailsProps) {
  if (!shipment) {
    return <p className="empty-state">Select a shipment to view details.</p>;
  }

  return (
    <article className="detail-panel">
      <header>
        <p>{statusLabels[shipment.status]}</p>
        <h3>{shipment.shipmentCode}</h3>
      </header>

      <dl>
        <div>
          <dt>Order number</dt>
          <dd>{shipment.orderNumber}</dd>
        </div>
        <div>
          <dt>Sender</dt>
          <dd>
            {shipment.sender.firstName} {shipment.sender.lastName}
          </dd>
        </div>
        <div>
          <dt>Receiver</dt>
          <dd>
            {shipment.receiver.firstName} {shipment.receiver.lastName}
          </dd>
        </div>
        <div>
          <dt>Dispatch address</dt>
          <dd>{shipment.dispatchAddress}</dd>
        </div>
        <div>
          <dt>Destination address</dt>
          <dd>{shipment.destinationAddress}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{shipment.size.toUpperCase()}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>{shipment.amount.toFixed(2)} EUR</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd>{shipment.paymentAtLocker ? 'At locker' : 'Online'}</dd>
        </div>
        <div>
          <dt>Shipment date</dt>
          <dd>{shipment.shipmentDate}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(shipment.createdAt)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{formatDate(shipment.updatedAt)}</dd>
        </div>
      </dl>
    </article>
  );
}
