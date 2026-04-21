import { useEffect, useMemo, useState } from 'react';

import { subsystems, type Subsystem, type SubsystemId } from './subsystems';

function getInitialSubsystem(): SubsystemId {
  const hash = window.location.hash.replace('#', '');
  return subsystems.some((subsystem) => subsystem.id === hash)
    ? (hash as SubsystemId)
    : 'shipments';
}

function App() {
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

        <nav className="subsystem-nav">
          {subsystems.map((subsystem) => (
            <button
              key={subsystem.id}
              className={subsystem.id === activeId ? 'active' : ''}
              type="button"
              onClick={() => selectSubsystem(subsystem.id)}
            >
              <span>{subsystem.name}</span>
              <small>{subsystem.primaryActor}</small>
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace" aria-labelledby="subsystem-title">
        <header className="workspace-header">
          <p>{activeSubsystem.primaryActor}</p>
          <h2 id="subsystem-title">{activeSubsystem.name}</h2>
          <span>{activeSubsystem.description}</span>
        </header>

        <div className="use-case-grid">
          {activeSubsystem.useCases.map((useCase) => (
            <article className="use-case-card" key={useCase}>
              <span>{useCase}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
