import type { Subsystem, SubsystemId } from '../models/subsystem';

type SubsystemNavProps = {
  activeId: SubsystemId;
  subsystems: Subsystem[];
  onSelect: (id: SubsystemId) => void;
};

export function SubsystemNav({ activeId, subsystems, onSelect }: SubsystemNavProps) {
  return (
    <nav className="subsystem-nav">
      {subsystems.map((subsystem) => (
        <button
          key={subsystem.id}
          className={subsystem.id === activeId ? 'active' : ''}
          type="button"
          onClick={() => onSelect(subsystem.id)}
        >
          <span>{subsystem.name}</span>
          <small>{subsystem.primaryActor}</small>
        </button>
      ))}
    </nav>
  );
}
