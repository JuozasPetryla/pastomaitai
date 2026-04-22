type NotificationActionsProps = {
  canEdit: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function NotificationActions({
  canEdit,
  canDelete,
  onCreate,
  onEdit,
  onDelete,
}: NotificationActionsProps) {
  return (
    <div className="admin-actions" aria-label="Notification actions">
      <button type="button" onClick={onCreate}>
        Create notification
      </button>
      <button type="button" disabled={!canEdit} onClick={onEdit}>
        Edit notification
      </button>
      <button type="button" disabled={!canDelete} onClick={onDelete}>
        Delete notification
      </button>
    </div>
  );
}
