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
    <div className="admin-actions" aria-label="Siuntos valdymo veiksmai">
      <button type="button" onClick={onCreate}>
        Kurti siunta
      </button>
      <button type="button" disabled={!canEdit} onClick={onEdit}>
        Redaguoti siunta
      </button>
      <button type="button" disabled={!canDelete} onClick={onDelete}>
        Naikinti siunta
      </button>
    </div>
  );
}
