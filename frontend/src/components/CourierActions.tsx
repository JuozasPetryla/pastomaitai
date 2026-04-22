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
    <div className="admin-actions" aria-label="Kurjerio valdymo veiksmai">
      <button type="button" onClick={onCreate}>
        Kurti kurjeri
      </button>
      <button type="button" disabled={!canEdit} onClick={onEdit}>
        Redaguoti kurjeri
      </button>
      <button type="button" disabled={!canDelete} onClick={onDelete}>
        Naikinti kurjeri
      </button>
    </div>
  );
}
