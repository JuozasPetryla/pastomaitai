type LockerActionsProps = {
  canEdit: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function LockerActions({
  canEdit,
  canDelete,
  onCreate,
  onEdit,
  onDelete,
}: LockerActionsProps) {
  return (
    <div className="admin-actions" aria-label="Locker actions">
      <button type="button" onClick={onCreate}>
        Create locker
      </button>
      <button type="button" disabled={!canEdit} onClick={onEdit}>
        Edit locker
      </button>
      <button type="button" disabled={!canDelete} onClick={onDelete}>
        Delete locker
      </button>
    </div>
  );
}
