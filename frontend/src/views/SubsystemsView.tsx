import { useEffect, useMemo, useState } from 'react';

import { SubsystemNav } from '../components/SubsystemNav';
import { UseCaseGrid } from '../components/UseCaseGrid';
import { subsystems } from '../models/subsystemsCatalog';
import type { Subsystem, SubsystemId } from '../models/subsystem';

function getInitialSubsystem(): SubsystemId {
  const hash = window.location.hash.replace('#', '');
  return subsystems.some((subsystem) => subsystem.id === hash)
    ? (hash as SubsystemId)
    : 'shipments';
}

export function SubsystemsView() {
  const [activeId, setActiveId] = useState<SubsystemId>(getInitialSubsystem);

  const activeSubsystem = useMemo<Subsystem>(
    () => subsystems.find((subsystem) => subsystem.id === activeId) ?? subsystems[0],
    [activeId],
  );

  useEffect(() => {
    const handleHashChange = () => setActiveId(getInitialSubsystem());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const selectSubsystem = (id: SubsystemId) => {
    setActiveId(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Posistemiai">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          <div>
            <h1>Pastomatai</h1>
            <p>Siuntų valdymo sistema</p>
          </div>
        </div>

        <SubsystemNav activeId={activeId} subsystems={subsystems} onSelect={selectSubsystem} />
      </aside>

      <section className="workspace" aria-labelledby="subsystem-title">
        <header className="workspace-header">
          <p>{activeSubsystem.primaryActor}</p>
          <h2 id="subsystem-title">{activeSubsystem.name}</h2>
          <span>{activeSubsystem.description}</span>
        </header>

        <UseCaseGrid useCases={activeSubsystem.useCases} />
      </section>
    </main>
  );
}
