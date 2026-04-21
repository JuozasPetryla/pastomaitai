type PastomatoActionsProps = {
  canEdit: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function PastomatoActions({
  canEdit,
  canDelete,
  onCreate,
  onEdit,
  onDelete,
}: PastomatoActionsProps) {
  return (
    <div className="admin-actions" aria-label="Paštomato valdymo veiksmai">
      <button type="button" onClick={onCreate}>
        Kurti paštomatą
      </button>
      <button type="button" disabled={!canEdit} onClick={onEdit}>
        Redaguoti paštomatą
      </button>
      <button type="button" disabled={!canDelete} onClick={onDelete}>
        Naikinti paštomatą
      </button>
    </div>
  );
}
