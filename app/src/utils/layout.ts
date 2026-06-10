import type { Employee, RoleNode } from '../types';

export type LaidOutNode = {
  id: string;
  x: number;
  y: number;
  parentId: string | null;
};

type Tree<T> = { id: string; data: T; children: Tree<T>[]; width?: number; x?: number };

const NODE_W = 220;
const NODE_H = 90;
const X_GAP = 28;
const Y_GAP = 80;

function buildTree<T extends { id: string; manager_id: string | null }>(items: T[]): Tree<T>[] {
  const byId = new Map<string, Tree<T>>();
  for (const it of items) byId.set(it.id, { id: it.id, data: it, children: [] });
  const roots: Tree<T>[] = [];
  for (const it of items) {
    const node = byId.get(it.id)!;
    if (it.manager_id && byId.has(it.manager_id)) {
      byId.get(it.manager_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// Walker-style minimal layout: postorder compute widths, preorder assign x
function computeWidth<T>(node: Tree<T>): number {
  if (node.children.length === 0) {
    node.width = NODE_W;
    return NODE_W;
  }
  let total = 0;
  for (const c of node.children) {
    total += computeWidth(c);
  }
  total += (node.children.length - 1) * X_GAP;
  node.width = Math.max(NODE_W, total);
  return node.width;
}

function assignX<T>(node: Tree<T>, x: number, depth: number, out: LaidOutNode[], parentId: string | null) {
  const w = node.width!;
  out.push({ id: node.id, x: x + w / 2 - NODE_W / 2, y: depth * (NODE_H + Y_GAP), parentId });
  if (node.children.length === 0) return;
  const childrenTotalW = node.children.reduce((s, c) => s + c.width!, 0) + (node.children.length - 1) * X_GAP;
  let cx = x + (w - childrenTotalW) / 2;
  for (const c of node.children) {
    assignX(c, cx, depth + 1, out, node.id);
    cx += c.width! + X_GAP;
  }
}

export function layoutEmployees(employees: Employee[]): LaidOutNode[] {
  const items = employees.map((e) => ({ id: e.employee_id, manager_id: e.manager_id }));
  const roots = buildTree(items);
  const out: LaidOutNode[] = [];
  let xOffset = 0;
  for (const root of roots) {
    computeWidth(root);
    assignX(root, xOffset, 0, out, null);
    xOffset += root.width! + X_GAP * 2;
  }
  return out;
}

export function layoutRoleNodes(nodes: RoleNode[]): LaidOutNode[] {
  const items = nodes.map((n) => ({ id: n.id, manager_id: n.manager_id }));
  const roots = buildTree(items);
  const out: LaidOutNode[] = [];
  let xOffset = 0;
  for (const root of roots) {
    computeWidth(root);
    assignX(root, xOffset, 0, out, null);
    xOffset += root.width! + X_GAP * 2;
  }
  return out;
}

export const NODE_DIMENSIONS = { width: NODE_W, height: NODE_H };
