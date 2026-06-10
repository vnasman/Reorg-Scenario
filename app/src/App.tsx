import { useCallback, useMemo, useState } from 'react';
import { AppContext, type AppState } from './store/useStore';
import type { Employee, Scenario } from './types';
import { Upload } from './components/Upload';
import { AsIsView } from './components/AsIsView';
import { ToBeView } from './components/ToBeView';
import { ImpactView } from './components/ImpactView';

function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [scenarios, setScenariosRaw] = useState<Scenario[]>([]);
  const [history, setHistory] = useState<Scenario[][]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [view, setView] = useState<AppState['view']>('upload');
  const [collapsed, setCollapsed] = useState<Record<string, string[]>>({});

  const commitScenarios = useCallback((next: Scenario[]) => {
    setHistory((h) => [...h.slice(-49), scenarios]);
    setScenariosRaw(next);
  }, [scenarios]);

  const resetScenarios = useCallback((next: Scenario[]) => {
    setHistory([]);
    setScenariosRaw(next);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setScenariosRaw(prev);
      return h.slice(0, -1);
    });
  }, []);

  const setCollapsedFor = useCallback((key: string, ids: string[]) => {
    setCollapsed((c) => ({ ...c, [key]: ids }));
  }, []);

  const toggleCollapse = useCallback((key: string, id: string) => {
    setCollapsed((c) => {
      const cur = c[key] ?? [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...c, [key]: next };
    });
  }, []);

  const ctx: AppState = useMemo(
    () => ({
      employees,
      setEmployees,
      scenarios,
      commitScenarios,
      resetScenarios,
      undo,
      canUndo: history.length > 0,
      activeScenarioId,
      setActiveScenarioId,
      view,
      setView,
      collapsed,
      setCollapsedFor,
      toggleCollapse,
    }),
    [employees, scenarios, history.length, activeScenarioId, view, collapsed, commitScenarios, resetScenarios, undo, setCollapsedFor, toggleCollapse],
  );

  const hasData = employees.length > 0;

  return (
    <AppContext.Provider value={ctx}>
      <div className="h-screen flex flex-col bg-ink-100">
        <header className="border-b border-ink-300 bg-white">
          <div className="px-5 py-3 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-ink-900" />
              <div className="text-sm font-medium tracking-tight text-ink-900">Organisationsdesign</div>
            </div>
            <nav className="flex items-center gap-1">
              <NavLink current={view} target="upload" label="Källdata" onClick={setView} />
              <NavLink current={view} target="asis" label="Nuläge" onClick={setView} disabled={!hasData} />
              <NavLink current={view} target="tobe" label="To-be" onClick={setView} disabled={!hasData} />
              <NavLink current={view} target="impact" label="Påverkan" onClick={setView} disabled={!hasData} />
            </nav>
            <div className="flex-1" />
            {hasData && (
              <div className="text-xs text-ink-500">
                {employees.length} anställda • {scenarios.length} {scenarios.length === 1 ? 'scenario' : 'scenarier'}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 min-h-0">
          {view === 'upload' && <Upload />}
          {view === 'asis' && hasData && <AsIsView />}
          {view === 'tobe' && hasData && <ToBeView />}
          {view === 'impact' && hasData && <ImpactView />}
        </main>
      </div>
    </AppContext.Provider>
  );
}

function NavLink({
  current,
  target,
  label,
  onClick,
  disabled,
}: {
  current: AppState['view'];
  target: AppState['view'];
  label: string;
  onClick: (v: AppState['view']) => void;
  disabled?: boolean;
}) {
  const active = current === target;
  return (
    <button
      onClick={() => !disabled && onClick(target)}
      disabled={disabled}
      className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
        active
          ? 'bg-ink-100 text-ink-900'
          : disabled
            ? 'text-ink-300 cursor-not-allowed'
            : 'text-ink-500 hover:text-ink-900'
      }`}
    >
      {label}
    </button>
  );
}

export default App;
