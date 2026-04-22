type ShipmentActionsProps = {
  canEdit: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function ShipmentActions({
  canEdit,
  canDelete,
  onCreate,
  onEdit,
  onDelete,
}: ShipmentActionsProps) {
  return (
    <div className="admin-actions" aria-label="Shipment actions">
      <button type="button" onClick={onCreate}>
        Create shipment
      </button>
      <button type="button" disabled={!canEdit} onClick={onEdit}>
        Edit shipment
      </button>
      <button type="button" disabled={!canDelete} onClick={onDelete}>
        Delete shipment
      </button>
    </div>
  );
}
