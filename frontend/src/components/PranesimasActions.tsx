type PranesimasActionsProps = {
  canEdit: boolean;
  canDelete: boolean;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function PranesimasActions({
  canEdit,
  canDelete,
  onCreate,
  onEdit,
  onDelete,
}: PranesimasActionsProps) {
  return (
    <div className="admin-actions" aria-label="Pranešimo valdymo veiksmai">
      <button type="button" onClick={onCreate}>
        Kurti pranešimą
      </button>
      <button type="button" disabled={!canEdit} onClick={onEdit}>
        Redaguoti pranešimą
      </button>
      <button type="button" disabled={!canDelete} onClick={onDelete}>
        Naikinti pranešimą
      </button>
    </div>
  );
}