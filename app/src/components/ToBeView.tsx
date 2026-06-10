import { useState } from 'react';
import { useApp, initialCollapsed } from '../store/useStore';
import { ScenarioOrgChart } from './OrgChart';
import { scenarioFromEmployees } from '../utils/analysis';
import type { RoleNode, Scenario, Employee } from '../types';

export function ToBeView() {
  const {
    employees,
    scenarios,
    commitScenarios,
    resetScenarios,
    activeScenarioId,
    setActiveScenarioId,
    collapsed,
    toggleCollapse,
    setCollapsedFor,
    undo,
    canUndo,
  } = useApp();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'chart' | 'table'>('chart');
  const [focusId, setFocusId] = useState<string | null>(null);

  const active = scenarios.find((s) => s.id === activeScenarioId) ?? null;

  function updateActive(updater: (s: Scenario) => Scenario) {
    if (!active) return;
    commitScenarios(scenarios.map((s) => (s.id === active.id ? updater(s) : s)));
  }

  function addScenario() {
    const base = scenarioFromEmployees(`Scenario ${scenarios.length + 1}`, employees);
    commitScenarios([...scenarios, base]);
    setActiveScenarioId(base.id);
    const items = Object.values(base.nodes).map((n) => ({ id: n.id, manager_id: n.manager_id }));
    setCollapsedFor(base.id, initialCollapsed(items));
  }

  function deleteScenario(id: string) {
    if (scenarios.length === 1) return;
    const next = scenarios.filter((s) => s.id !== id);
    commitScenarios(next);
    if (activeScenarioId === id) setActiveScenarioId(next[0]?.id ?? null);
  }

  function renameScenario(id: string, name: string) {
    // Direct mutation w/o undo for naming — it's annoying to undo
    const next = scenarios.map((s) => (s.id === id ? { ...s, name } : s));
    resetScenarios(next);
  }

  function duplicateScenario(id: string) {
    const src = scenarios.find((s) => s.id === id);
    if (!src) return;
    const copy: Scenario = {
      id: crypto.randomUUID(),
      name: `${src.name} (kopia)`,
      nodes: Object.fromEntries(Object.entries(src.nodes).map(([k, v]) => [k, { ...v }])),
    };
    commitScenarios([...scenarios, copy]);
    setActiveScenarioId(copy.id);
    // Carry over the source scenario's collapsed state
    const srcCollapsed = collapsed[src.id] ?? [];
    setCollapsedFor(copy.id, srcCollapsed);
  }

  function updateNode(nodeId: string, patch: Partial<RoleNode>) {
    updateActive((s) => ({ ...s, nodes: { ...s.nodes, [nodeId]: { ...s.nodes[nodeId], ...patch } } }));
  }

  function assignEmployee(nodeId: string, empId: string | null) {
    updateActive((s) => {
      const next: Record<string, RoleNode> = { ...s.nodes };
      if (empId) {
        for (const [k, v] of Object.entries(next)) {
          if (k !== nodeId && v.assignedEmployeeId === empId) {
            next[k] = { ...v, assignedEmployeeId: null };
          }
        }
      }
      next[nodeId] = { ...next[nodeId], assignedEmployeeId: empId };
      return { ...s, nodes: next };
    });
  }

  function deleteNode(nodeId: string) {
    updateActive((s) => {
      const remaining: Record<string, RoleNode> = {};
      for (const [k, v] of Object.entries(s.nodes)) {
        if (k === nodeId) continue;
        remaining[k] = v.manager_id === nodeId ? { ...v, manager_id: null } : v;
      }
      return { ...s, nodes: remaining };
    });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }

  function addEmptyRole(parentId: string | null) {
    if (!active) return;
    const id = crypto.randomUUID();
    const parent = parentId ? active.nodes[parentId] : null;
    const newNode: RoleNode = {
      id,
      title: 'Ny roll',
      department: parent?.department ?? 'Övrigt',
      level: parent ? Math.min(6, parent.level + 1) : 1,
      manager_id: parentId,
      assignedEmployeeId: null,
      isNewRole: true,
    };
    updateActive((s) => ({ ...s, nodes: { ...s.nodes, [id]: newNode } }));
    setSelectedNodeId(id);
    // Make sure the parent (if any) is expanded so the new node is visible,
    // then trigger the chart to recenter on the new node.
    if (parentId) {
      const cur = collapsed[active.id] ?? [];
      if (cur.includes(parentId)) {
        setCollapsedFor(
          active.id,
          cur.filter((x) => x !== parentId),
        );
      }
    }
    setFocusId(id);
    // Reset focusId quickly so re-adding the same id triggers another focus
    setTimeout(() => setFocusId((cur) => (cur === id ? null : cur)), 800);
  }

  const selectedNode = selectedNodeId && active ? active.nodes[selectedNodeId] : null;

  if (!active) {
    return (
      <div className="p-8 text-ink-500">
        Inga scenarier ännu.
        <button onClick={addScenario} className="ml-2 underline">
          Skapa ett från nuläget
        </button>
      </div>
    );
  }

  const activeCollapsed = collapsed[active.id] ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* Scenario tabs */}
      <div className="flex items-center gap-1 border-b border-ink-300 bg-white px-3 py-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveScenarioId(s.id)}
            className={`text-sm px-3 py-1 rounded-md transition-colors ${
              s.id === activeScenarioId ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100'
            }`}
          >
            {s.name}
          </button>
        ))}
        <button onClick={addScenario} className="text-sm px-2 py-1 text-ink-500 hover:text-ink-900">
          + Nytt scenario
        </button>
        <div className="flex-1" />
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`text-xs px-2 py-1 ${canUndo ? 'text-ink-700 hover:text-ink-900' : 'text-ink-300 cursor-not-allowed'}`}
          title="Ångra senaste ändring (⌘Z)"
        >
          ↶ Ångra
        </button>
        <button onClick={() => duplicateScenario(active.id)} className="text-xs px-2 py-1 text-ink-500 hover:text-ink-900">
          Duplicera
        </button>
        {scenarios.length > 1 && (
          <button onClick={() => deleteScenario(active.id)} className="text-xs px-2 py-1 text-red-600 hover:text-red-700">
            Ta bort
          </button>
        )}
        <div className="mx-2 h-4 w-px bg-ink-300" />
        <button
          onClick={() => setEditMode('chart')}
          className={`text-xs px-2 py-1 rounded ${editMode === 'chart' ? 'bg-ink-100 text-ink-900' : 'text-ink-500'}`}
        >
          Schema
        </button>
        <button
          onClick={() => setEditMode('table')}
          className={`text-xs px-2 py-1 rounded ${editMode === 'table' ? 'bg-ink-100 text-ink-900' : 'text-ink-500'}`}
        >
          Tabell
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 border-r border-ink-300 bg-white">
          {editMode === 'chart' ? (
            <ScenarioOrgChart
              scenarioNodes={active.nodes}
              employees={employees}
              onNodeClick={setSelectedNodeId}
              selectedId={selectedNodeId}
              collapsedIds={activeCollapsed}
              onToggleCollapse={(id) => toggleCollapse(active.id, id)}
              focusId={focusId}
            />
          ) : (
            <TableEditor scenario={active} updateNode={updateNode} deleteNode={deleteNode} onSelect={setSelectedNodeId} selectedId={selectedNodeId} />
          )}
        </div>

        <aside className="w-[380px] shrink-0 overflow-y-auto bg-ink-100">
          <div className="p-5 space-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-500">Scenario</div>
              <input
                value={active.name}
                onChange={(e) => renameScenario(active.id, e.target.value)}
                className="mt-1 w-full text-lg font-medium text-ink-900 bg-transparent outline-none border-b border-transparent focus:border-ink-900"
              />
            </div>

            <NodeEditor
              node={selectedNode}
              scenario={active}
              employees={employees}
              onChange={(patch) => selectedNode && updateNode(selectedNode.id, patch)}
              onAssign={(empId) => selectedNode && assignEmployee(selectedNode.id, empId)}
              onDelete={() => selectedNode && deleteNode(selectedNode.id)}
              onAddChild={() => addEmptyRole(selectedNode?.id ?? null)}
            />

            <div className="rounded-md border border-ink-300 bg-white p-3">
              <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">Snabbåtgärder</div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => addEmptyRole(null)} className="text-xs text-left text-ink-700 hover:text-ink-900">
                  + Lägg till tom roll på toppnivå
                </button>
                <button onClick={() => addEmptyRole(selectedNode?.id ?? null)} className="text-xs text-left text-ink-700 hover:text-ink-900" disabled={!selectedNode}>
                  + Lägg till tom roll under vald
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function NodeEditor({
  node,
  scenario,
  employees,
  onChange,
  onAssign,
  onDelete,
  onAddChild,
}: {
  node: RoleNode | null;
  scenario: Scenario;
  employees: Employee[];
  onChange: (patch: Partial<RoleNode>) => void;
  onAssign: (empId: string | null) => void;
  onDelete: () => void;
  onAddChild: () => void;
}) {
  if (!node) {
    return <div className="rounded-md border border-ink-300 bg-white p-3 text-xs text-ink-500">Välj en nod i schemat eller tabellen för att redigera.</div>;
  }
  const possibleParents = Object.values(scenario.nodes).filter((n) => n.id !== node.id);
  const empToRole = new Map<string, RoleNode>();
  for (const n of Object.values(scenario.nodes)) {
    if (n.assignedEmployeeId) empToRole.set(n.assignedEmployeeId, n);
  }
  return (
    <div className="rounded-md border border-ink-900 bg-white p-3 space-y-3">
      <div className="text-xs uppercase tracking-wider text-ink-500">Redigera roll</div>

      <div>
        <label className="text-[11px] text-ink-500">Titel</label>
        <input value={node.title} onChange={(e) => onChange({ title: e.target.value })} className="mt-0.5 w-full text-sm border border-ink-300 rounded px-2 py-1" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-ink-500">Avdelning</label>
          <input value={node.department} onChange={(e) => onChange({ department: e.target.value })} className="mt-0.5 w-full text-sm border border-ink-300 rounded px-2 py-1" />
        </div>
        <div>
          <label className="text-[11px] text-ink-500">Nivå</label>
          <input type="number" min={1} max={6} value={node.level} onChange={(e) => onChange({ level: Number(e.target.value) })} className="mt-0.5 w-full text-sm border border-ink-300 rounded px-2 py-1" />
        </div>
      </div>

      <div>
        <label className="text-[11px] text-ink-500">Rapporterar till</label>
        <select
          value={node.manager_id ?? ''}
          onChange={(e) => onChange({ manager_id: e.target.value || null })}
          className="mt-0.5 w-full text-sm border border-ink-300 rounded px-2 py-1 bg-white"
        >
          <option value="">— Ingen (toppnivå)</option>
          {possibleParents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} {p.assignedEmployeeId ? `(${employees.find((e) => e.employee_id === p.assignedEmployeeId)?.name ?? '?'})` : '(vakant)'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[11px] text-ink-500">Tillsatt av</label>
        <select
          value={node.assignedEmployeeId ?? ''}
          onChange={(e) => onAssign(e.target.value || null)}
          className="mt-0.5 w-full text-sm border border-ink-300 rounded px-2 py-1 bg-white"
        >
          <option value="">— Vakant</option>
          {employees.map((e) => {
            const existingRole = empToRole.get(e.employee_id);
            const takenElsewhere = existingRole && existingRole.id !== node.id;
            return (
              <option key={e.employee_id} value={e.employee_id}>
                {e.name} ({e.title}){takenElsewhere ? ` — sitter på ${existingRole!.title}` : ''}
              </option>
            );
          })}
        </select>
        {node.assignedEmployeeId === null && (
          <div className="text-[11px] text-amber-700 mt-1">Att välja en person som redan är tillsatt vakanterar dennes nuvarande roll.</div>
        )}
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-700">
        <input type="checkbox" checked={node.isNewRole} onChange={(e) => onChange({ isNewRole: e.target.checked })} />
        Markera som ny roll
      </label>

      <div className="flex gap-2 pt-1">
        <button onClick={onAddChild} className="text-xs rounded border border-ink-300 px-2 py-1 hover:border-ink-900">+ Underroll</button>
        <button onClick={onDelete} className="text-xs rounded border border-red-200 text-red-700 px-2 py-1 hover:bg-red-50">Ta bort</button>
      </div>
    </div>
  );
}

function TableEditor({
  scenario,
  updateNode,
  deleteNode,
  onSelect,
  selectedId,
}: {
  scenario: Scenario;
  updateNode: (id: string, patch: Partial<RoleNode>) => void;
  deleteNode: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const { employees } = useApp();
  const rows = Object.values(scenario.nodes);
  const empById = new Map(employees.map((e) => [e.employee_id, e]));
  const nodeById = new Map(rows.map((n) => [n.id, n]));

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white border-b border-ink-300">
          <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500">
            <th className="px-3 py-2">Titel</th>
            <th className="px-3 py-2">Avdelning</th>
            <th className="px-3 py-2">Nivå</th>
            <th className="px-3 py-2">Rapporterar till</th>
            <th className="px-3 py-2">Tillsatt av</th>
            <th className="px-3 py-2">Ny?</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => {
            const parent = n.manager_id ? nodeById.get(n.manager_id) : null;
            const assigned = n.assignedEmployeeId ? empById.get(n.assignedEmployeeId) : null;
            return (
              <tr
                key={n.id}
                onClick={() => onSelect(n.id)}
                className={`border-b border-ink-100 cursor-pointer hover:bg-ink-100 ${selectedId === n.id ? 'bg-ink-100' : ''}`}
              >
                <td className="px-3 py-2">
                  <input
                    value={n.title}
                    onChange={(e) => updateNode(n.id, { title: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={n.department}
                    onChange={(e) => updateNode(n.id, { department: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-transparent outline-none"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={n.level}
                    onChange={(e) => updateNode(n.id, { level: Number(e.target.value) })}
                    onClick={(e) => e.stopPropagation()}
                    className="w-12 bg-transparent outline-none"
                  />
                </td>
                <td className="px-3 py-2 text-ink-500 truncate max-w-[180px]">{parent ? parent.title : '—'}</td>
                <td className={`px-3 py-2 ${assigned ? 'text-ink-900' : 'text-amber-700 italic'}`}>{assigned?.name ?? 'Vakant'}</td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={n.isNewRole} onChange={(e) => updateNode(n.id, { isNewRole: e.target.checked })} onClick={(e) => e.stopPropagation()} />
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(n.id);
                    }}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Ta bort
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
