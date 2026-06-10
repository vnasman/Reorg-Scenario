import { createContext, useContext } from 'react';
import type { Employee, Scenario } from '../types';

export type AppState = {
  employees: Employee[];
  setEmployees: (e: Employee[]) => void;

  scenarios: Scenario[];
  // commits a new scenarios state and pushes the previous to undo history
  commitScenarios: (s: Scenario[]) => void;
  // sets scenarios without recording undo history (use for initial load)
  resetScenarios: (s: Scenario[]) => void;
  undo: () => void;
  canUndo: boolean;

  activeScenarioId: string | null;
  setActiveScenarioId: (id: string | null) => void;

  view: 'upload' | 'asis' | 'tobe' | 'impact';
  setView: (v: 'upload' | 'asis' | 'tobe' | 'impact') => void;

  // Collapsed node ids keyed by view ('asis' or scenario id)
  collapsed: Record<string, string[]>;
  setCollapsedFor: (key: string, ids: string[]) => void;
  toggleCollapse: (key: string, id: string) => void;
};

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppContext missing');
  return ctx;
}

// Returns ids of all nodes that have children except the root(s) — used as the
// initial collapsed set so the chart starts with VD + 1 level expanded.
export function initialCollapsed<T extends { id: string; manager_id: string | null }>(items: T[]): string[] {
  const hasChildren = new Set<string>();
  for (const it of items) {
    if (it.manager_id) hasChildren.add(it.manager_id);
  }
  return items.filter((i) => i.manager_id !== null && hasChildren.has(i.id)).map((i) => i.id);
}
