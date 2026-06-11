import { useEffect, useMemo, memo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { Employee, RoleNode } from '../types';
import { layoutEmployees, layoutRoleNodes, NODE_DIMENSIONS } from '../utils/layout';

type Variant = 'filled' | 'vacant' | 'new' | 'removed';

type PersonNodeData = {
  primary: string;
  secondary: string;
  meta: string;
  variant: Variant;
  hasChildren: boolean;
  collapsed: boolean;
  onToggleCollapse?: (id: string) => void;
  id: string;
};

const variantStyles: Record<Variant, { bg: string; border: string; primary: string; secondary: string; meta: string }> = {
  filled: { bg: 'bg-white', border: 'border-ink-300', primary: 'text-ink-900', secondary: 'text-ink-700', meta: 'text-ink-500' },
  vacant: { bg: 'bg-amber-50', border: 'border-amber-300 border-dashed', primary: 'text-amber-900', secondary: 'text-amber-800', meta: 'text-amber-700' },
  new: { bg: 'bg-emerald-50', border: 'border-emerald-300', primary: 'text-emerald-900', secondary: 'text-emerald-800', meta: 'text-emerald-700' },
  removed: { bg: 'bg-red-50', border: 'border-red-200', primary: 'text-red-800', secondary: 'text-red-700', meta: 'text-red-600' },
};

const PersonNode = memo(({ data }: NodeProps<PersonNodeData>) => {
  const s = variantStyles[data.variant];
  return (
    <div
      className={`relative rounded-lg border ${s.bg} ${s.border} px-3 py-2 shadow-soft transition-shadow hover:shadow-md`}
      style={{ width: NODE_DIMENSIONS.width, height: NODE_DIMENSIONS.height }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-1 !h-1" />
      <div className={`text-[13px] font-medium leading-tight truncate pr-5 ${s.primary}`}>{data.primary}</div>
      <div className={`text-[12px] mt-0.5 leading-tight truncate ${s.secondary}`}>{data.secondary}</div>
      <div className={`text-[11px] mt-1 leading-tight truncate ${s.meta}`}>{data.meta}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-1 !h-1" />
      {data.hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse?.(data.id);
          }}
          className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border border-ink-300 text-[10px] leading-none flex items-center justify-center text-ink-700 hover:border-ink-900 hover:text-ink-900 shadow-soft`}
          title={data.collapsed ? 'Expand' : 'Collapse'}
          aria-label={data.collapsed ? 'Expand' : 'Collapse'}
        >
          {data.collapsed ? '+' : '−'}
        </button>
      )}
    </div>
  );
});

const nodeTypes = { person: PersonNode };

function filterVisible<T extends { id: string; manager_id: string | null }>(items: T[], collapsedIds: string[]): T[] {
  const collapsed = new Set(collapsedIds);
  const parentOf = new Map<string, string | null>();
  for (const i of items) parentOf.set(i.id, i.manager_id);

  const hidden = new Set<string>();
  // A node is hidden iff any strict ancestor is in `collapsed`.
  for (const i of items) {
    let cur: string | null = i.manager_id;
    while (cur !== null) {
      if (collapsed.has(cur)) {
        hidden.add(i.id);
        break;
      }
      cur = parentOf.get(cur) ?? null;
    }
  }
  return items.filter((i) => !hidden.has(i.id));
}

function Focuser({ focusId }: { focusId: string | null }) {
  const rf = useReactFlow();
  useEffect(() => {
    if (!focusId) return;
    const t = setTimeout(() => {
      const node = rf.getNode(focusId);
      if (!node) return;
      rf.setCenter(node.position.x + NODE_DIMENSIONS.width / 2, node.position.y + NODE_DIMENSIONS.height / 2, {
        zoom: 1.1,
        duration: 600,
      });
    }, 60);
    return () => clearTimeout(t);
  }, [focusId, rf]);
  return null;
}

export function EmployeeOrgChart({
  employees,
  onNodeClick,
  collapsedIds = [],
  onToggleCollapse,
}: {
  employees: Employee[];
  onNodeClick?: (id: string) => void;
  collapsedIds?: string[];
  onToggleCollapse?: (id: string) => void;
}) {
  const { nodes, edges } = useMemo(() => {
    const items = employees.map((e) => ({ id: e.employee_id, manager_id: e.manager_id }));
    const visible = filterVisible(items, collapsedIds);
    const layout = layoutEmployees(employees.filter((e) => visible.some((v) => v.id === e.employee_id)));
    const byEmpId = new Map(employees.map((e) => [e.employee_id, e]));
    const collapsedSet = new Set(collapsedIds);
    const hasChildren = new Set<string>();
    for (const i of items) if (i.manager_id) hasChildren.add(i.manager_id);

    const nodes: Node[] = layout.map((l) => {
      const e = byEmpId.get(l.id)!;
      return {
        id: l.id,
        position: { x: l.x, y: l.y },
        type: 'person',
        data: {
          id: l.id,
          primary: e.title,
          secondary: e.name,
          meta: `${e.department} • ${e.location}`,
          variant: 'filled' as const,
          hasChildren: hasChildren.has(l.id),
          collapsed: collapsedSet.has(l.id),
          onToggleCollapse,
        },
      };
    });
    const edges: Edge[] = layout
      .filter((l) => l.parentId)
      .map((l) => ({
        id: `${l.parentId}-${l.id}`,
        source: l.parentId!,
        target: l.id,
        type: 'smoothstep',
      }));
    return { nodes, edges };
  }, [employees, collapsedIds, onToggleCollapse]);

  return (
    <ReactFlowProvider>
      <div className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, n) => onNodeClick?.(n.id)}
        >
          <Background gap={32} size={1} color="#eaeaea" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

export function ScenarioOrgChart({
  scenarioNodes,
  employees,
  onNodeClick,
  selectedId,
  collapsedIds = [],
  onToggleCollapse,
  focusId = null,
}: {
  scenarioNodes: Record<string, RoleNode>;
  employees: Employee[];
  onNodeClick?: (id: string) => void;
  selectedId?: string | null;
  collapsedIds?: string[];
  onToggleCollapse?: (id: string) => void;
  focusId?: string | null;
}) {
  const { nodes, edges } = useMemo(() => {
    const empById = new Map(employees.map((e) => [e.employee_id, e]));
    const items = Object.values(scenarioNodes);
    const visible = filterVisible(items, collapsedIds);
    const visibleSet = new Set(visible.map((v) => v.id));
    const layout = layoutRoleNodes(items.filter((n) => visibleSet.has(n.id)));
    const byNodeId = new Map(items.map((n) => [n.id, n]));
    const collapsedSet = new Set(collapsedIds);
    const hasChildren = new Set<string>();
    for (const i of items) if (i.manager_id) hasChildren.add(i.manager_id);

    const rfNodes: Node[] = layout.map((l) => {
      const n = byNodeId.get(l.id)!;
      const assigned = n.assignedEmployeeId ? empById.get(n.assignedEmployeeId) : null;
      const variant: Variant = n.isNewRole && !assigned ? 'new' : !assigned ? 'vacant' : n.isNewRole ? 'new' : 'filled';
      return {
        id: l.id,
        position: { x: l.x, y: l.y },
        type: 'person',
        data: {
          id: l.id,
          primary: n.title,
          secondary: assigned ? assigned.name : 'Vacant',
          meta: `${n.department} • Level ${n.level}${n.isNewRole ? ' • New role' : ''}`,
          variant,
          hasChildren: hasChildren.has(l.id),
          collapsed: collapsedSet.has(l.id),
          onToggleCollapse,
        },
        style: selectedId === l.id ? { outline: '2px solid #0a0a0a', outlineOffset: 2, borderRadius: 10 } : undefined,
      };
    });
    const rfEdges: Edge[] = layout
      .filter((l) => l.parentId)
      .map((l) => ({
        id: `${l.parentId}-${l.id}`,
        source: l.parentId!,
        target: l.id,
        type: 'smoothstep',
      }));
    return { nodes: rfNodes, edges: rfEdges };
  }, [scenarioNodes, employees, selectedId, collapsedIds, onToggleCollapse]);

  return (
    <ReactFlowProvider>
      <div className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, n) => onNodeClick?.(n.id)}
        >
          <Background gap={32} size={1} color="#eaeaea" />
          <Controls showInteractive={false} />
        </ReactFlow>
        <Focuser focusId={focusId} />
      </div>
    </ReactFlowProvider>
  );
}
