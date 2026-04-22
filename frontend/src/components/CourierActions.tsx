type CourierActionsProps = {
  canEdit: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function CourierActions({
  canEdit,
  canDelete,
  onCreate,
  onEdit,
  onDelete,
}: CourierActionsProps) {
  return (
    <div className="admin-actions" aria-label="Courier actions">
      <button type="button" onClick={onCreate}>
        Create courier
      </button>
      <button type="button" disabled={!canEdit} onClick={onEdit}>
        Edit courier
      </button>
      <button type="button" disabled={!canDelete} onClick={onDelete}>
        Delete courier
      </button>
    </div>
  );
}
