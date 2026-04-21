export type AppModalAction = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
};

type AppModalProps = {
  title: string;
  message: string;
  actions: AppModalAction[];
};

export function AppModal({ title, message, actions }: AppModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header>
          <h3 id="modal-title">{title}</h3>
        </header>
        <p>{message}</p>
        <div className="modal-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              className={action.variant ?? 'secondary'}
              type="button"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
