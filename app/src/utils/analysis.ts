import type { Employee, RoleNode, Scenario, EmployeeImpact, Signal } from '../types';

export type AsIsStats = {
  headcount: number;
  managers: number;
  ics: number;
  maxDepth: number;
  avgSpan: number;
  maxSpan: number;
  spansByManager: { manager_id: string; span: number; name: string; title: string }[];
  departments: { name: string; count: number }[];
  locations: { name: string; count: number }[];
  genderSplit: { F: number; M: number; X: number };
  avgAge: number;
  avgTenureYears: number;
  payroll: number; // total monthly
  signals: Signal[];
};

function depthOf(empId: string, byId: Map<string, Employee>, memo: Map<string, number>): number {
  if (memo.has(empId)) return memo.get(empId)!;
  const e = byId.get(empId);
  if (!e || !e.manager_id) {
    memo.set(empId, 0);
    return 0;
  }
  const d = depthOf(e.manager_id, byId, memo) + 1;
  memo.set(empId, d);
  return d;
}

export function analyzeAsIs(employees: Employee[]): AsIsStats {
  const byId = new Map(employees.map((e) => [e.employee_id, e]));
  const reports = new Map<string, string[]>();
  for (const e of employees) {
    if (e.manager_id) {
      if (!reports.has(e.manager_id)) reports.set(e.manager_id, []);
      reports.get(e.manager_id)!.push(e.employee_id);
    }
  }

  const memo = new Map<string, number>();
  let maxDepth = 0;
  for (const e of employees) maxDepth = Math.max(maxDepth, depthOf(e.employee_id, byId, memo));

  const spansByManager = Array.from(reports.entries()).map(([mid, arr]) => {
    const m = byId.get(mid);
    return { manager_id: mid, span: arr.length, name: m?.name ?? '?', title: m?.title ?? '?' };
  });
  spansByManager.sort((a, b) => b.span - a.span);

  const avgSpan = spansByManager.length === 0 ? 0 : spansByManager.reduce((s, x) => s + x.span, 0) / spansByManager.length;
  const maxSpan = spansByManager.length === 0 ? 0 : spansByManager[0].span;

  const deptMap = new Map<string, number>();
  const locMap = new Map<string, number>();
  const genderSplit = { F: 0, M: 0, X: 0 };
  let ageSum = 0;
  let ageN = 0;
  let tenureSum = 0;
  let tenureN = 0;
  let payroll = 0;

  for (const e of employees) {
    deptMap.set(e.department, (deptMap.get(e.department) ?? 0) + 1);
    locMap.set(e.location, (locMap.get(e.location) ?? 0) + 1);
    genderSplit[e.gender] = (genderSplit[e.gender] ?? 0) + 1;
    if (e.birth_year) {
      ageSum += 2026 - e.birth_year;
      ageN++;
    }
    if (e.hire_date) {
      const y = Number(e.hire_date.slice(0, 4));
      if (Number.isFinite(y)) {
        tenureSum += 2026 - y;
        tenureN++;
      }
    }
    payroll += (e.salary ?? 0) * (e.fte ?? 1);
  }

  const departments = Array.from(deptMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const locations = Array.from(locMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const signals: Signal[] = [];

  for (const s of spansByManager) {
    if (s.span >= 9) signals.push({ severity: 'warn', title: `High span of control: ${s.name}`, detail: `${s.title} has ${s.span} direct reports — consider splitting.` });
    if (s.span === 1) signals.push({ severity: 'info', title: `Single direct report: ${s.name}`, detail: `${s.title} has only 1 direct report — possible flattening.` });
  }

  if (maxDepth >= 5) signals.push({ severity: 'warn', title: 'Deep hierarchy', detail: `${maxDepth + 1} levels from CEO to the bottom — risk of slow decisions.` });

  const totalGendered = genderSplit.F + genderSplit.M;
  if (totalGendered > 0) {
    const fShare = genderSplit.F / totalGendered;
    if (fShare < 0.35 || fShare > 0.65) {
      signals.push({ severity: 'info', title: 'Skewed gender split', detail: `${Math.round(fShare * 100)}% women / ${Math.round((1 - fShare) * 100)}% men — consider when filling roles.` });
    }
  }

  const managers = spansByManager.length;
  const ics = employees.length - managers;

  return {
    headcount: employees.length,
    managers,
    ics,
    maxDepth: maxDepth + 1,
    avgSpan,
    maxSpan,
    spansByManager,
    departments,
    locations,
    genderSplit,
    avgAge: ageN ? ageSum / ageN : 0,
    avgTenureYears: tenureN ? tenureSum / tenureN : 0,
    payroll,
    signals,
  };
}

export type ScenarioStats = AsIsStats & {
  totalRoles: number;
  filled: number;
  vacancies: number;
  newRoles: number;
  removed: number;
};

export function analyzeScenario(scenario: Scenario, employees: Employee[]): ScenarioStats {
  const empById = new Map(employees.map((e) => [e.employee_id, e]));
  const nodes = Object.values(scenario.nodes);
  const byNodeId = new Map(nodes.map((n) => [n.id, n]));

  const reports = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.manager_id) {
      if (!reports.has(n.manager_id)) reports.set(n.manager_id, []);
      reports.get(n.manager_id)!.push(n.id);
    }
  }

  const depthMemo = new Map<string, number>();
  function nodeDepth(id: string): number {
    if (depthMemo.has(id)) return depthMemo.get(id)!;
    const n = byNodeId.get(id);
    if (!n || !n.manager_id) {
      depthMemo.set(id, 0);
      return 0;
    }
    const d = nodeDepth(n.manager_id) + 1;
    depthMemo.set(id, d);
    return d;
  }
  let maxDepth = 0;
  for (const n of nodes) maxDepth = Math.max(maxDepth, nodeDepth(n.id));

  const spansByManager = Array.from(reports.entries())
    .map(([mid, arr]) => {
      const n = byNodeId.get(mid);
      const assigned = n?.assignedEmployeeId ? empById.get(n.assignedEmployeeId) : null;
      return { manager_id: mid, span: arr.length, name: assigned?.name ?? 'Vacant', title: n?.title ?? '?' };
    })
    .sort((a, b) => b.span - a.span);

  const avgSpan = spansByManager.length === 0 ? 0 : spansByManager.reduce((s, x) => s + x.span, 0) / spansByManager.length;
  const maxSpan = spansByManager.length === 0 ? 0 : spansByManager[0].span;

  const deptMap = new Map<string, number>();
  for (const n of nodes) deptMap.set(n.department, (deptMap.get(n.department) ?? 0) + 1);
  const departments = Array.from(deptMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // Locations only for filled roles
  const locMap = new Map<string, number>();
  for (const n of nodes) {
    if (n.assignedEmployeeId) {
      const e = empById.get(n.assignedEmployeeId);
      if (e) locMap.set(e.location, (locMap.get(e.location) ?? 0) + 1);
    }
  }
  const locations = Array.from(locMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const genderSplit = { F: 0, M: 0, X: 0 };
  let ageSum = 0, ageN = 0, tenureSum = 0, tenureN = 0, payroll = 0;
  let filled = 0;
  for (const n of nodes) {
    if (!n.assignedEmployeeId) continue;
    const e = empById.get(n.assignedEmployeeId);
    if (!e) continue;
    filled++;
    genderSplit[e.gender] = (genderSplit[e.gender] ?? 0) + 1;
    if (e.birth_year) { ageSum += 2026 - e.birth_year; ageN++; }
    if (e.hire_date) {
      const y = Number(e.hire_date.slice(0, 4));
      if (Number.isFinite(y)) { tenureSum += 2026 - y; tenureN++; }
    }
    payroll += (e.salary ?? 0) * (e.fte ?? 1);
  }

  const signals: Signal[] = [];
  for (const s of spansByManager) {
    if (s.span >= 9) signals.push({ severity: 'warn', title: `High span of control: ${s.name}`, detail: `${s.title} has ${s.span} direct reports — consider splitting.` });
    if (s.span === 1) signals.push({ severity: 'info', title: `Single direct report: ${s.name}`, detail: `${s.title} has only 1 direct report — possible flattening.` });
  }
  if (maxDepth >= 5) signals.push({ severity: 'warn', title: 'Deep hierarchy', detail: `${maxDepth + 1} levels from top to bottom — risk of slow decisions.` });
  const totalGendered = genderSplit.F + genderSplit.M;
  if (totalGendered > 0) {
    const fShare = genderSplit.F / totalGendered;
    if (fShare < 0.35 || fShare > 0.65) {
      signals.push({ severity: 'info', title: 'Skewed gender split', detail: `${Math.round(fShare * 100)}% women / ${Math.round((1 - fShare) * 100)}% men — consider when filling roles.` });
    }
  }

  const totalRoles = nodes.length;
  const managers = spansByManager.length;
  const ics = totalRoles - managers;
  const vacancies = nodes.filter((n) => !n.assignedEmployeeId).length;
  const newRoles = nodes.filter((n) => n.isNewRole).length;
  const assignedSet = new Set(nodes.map((n) => n.assignedEmployeeId).filter(Boolean) as string[]);
  const removed = employees.filter((e) => !assignedSet.has(e.employee_id)).length;

  return {
    // headcount in AsIsStats is "people"; here we use filled to keep semantics consistent
    headcount: filled,
    managers,
    ics,
    maxDepth: maxDepth + 1,
    avgSpan,
    maxSpan,
    spansByManager,
    departments,
    locations,
    genderSplit,
    avgAge: ageN ? ageSum / ageN : 0,
    avgTenureYears: tenureN ? tenureSum / tenureN : 0,
    payroll,
    signals,
    totalRoles,
    filled,
    vacancies,
    newRoles,
    removed,
  };
}

// Compute impact of a scenario vs. as-is
export function computeImpact(employees: Employee[], scenario: Scenario): {
  impacts: EmployeeImpact[];
  vacancies: RoleNode[];
  newRoles: RoleNode[];
  removedCount: number;
  filledByMatching: { role: RoleNode; candidates: Employee[] }[];
} {
  const nodes = Object.values(scenario.nodes);

  // Map: employee_id -> role node assigned to them
  const empToNode = new Map<string, RoleNode>();
  for (const n of nodes) {
    if (n.assignedEmployeeId) empToNode.set(n.assignedEmployeeId, n);
  }

  const impacts: EmployeeImpact[] = [];
  for (const e of employees) {
    const node = empToNode.get(e.employee_id);
    if (!node) {
      impacts.push({
        employee_id: e.employee_id,
        category: 'removed',
        oldManager: e.manager_id,
        newManager: null,
        oldTitle: e.title,
        newTitle: null,
        oldLevel: e.level,
        newLevel: null,
      });
      continue;
    }

    const newParentNode = node.manager_id ? scenario.nodes[node.manager_id] : null;
    const newManagerEmpId = newParentNode?.assignedEmployeeId ?? null;
    const oldManager = e.manager_id;

    let category: EmployeeImpact['category'] = 'unchanged';
    if (node.level < e.level) category = 'promoted';
    else if (node.level > e.level) category = 'demoted';
    else if (newManagerEmpId !== oldManager) category = 'new_manager';
    else if (node.title !== e.title || node.department !== e.department) category = 'moved';

    impacts.push({
      employee_id: e.employee_id,
      category,
      oldManager,
      newManager: newManagerEmpId,
      oldTitle: e.title,
      newTitle: node.title,
      oldLevel: e.level,
      newLevel: node.level,
    });
  }

  const vacancies = nodes.filter((n) => !n.assignedEmployeeId);
  const newRoles = nodes.filter((n) => n.isNewRole);
  const removedCount = impacts.filter((i) => i.category === 'removed').length;

  // Vacancy matching: for each vacant role, suggest employees currently affected (removed/demoted) who could fill it
  const candidates = employees.filter((e) => {
    const imp = impacts.find((i) => i.employee_id === e.employee_id);
    return imp?.category === 'removed' || imp?.category === 'demoted';
  });

  const filledByMatching = vacancies.map((role) => {
    const matches = candidates
      .map((c) => ({ emp: c, score: matchScore(c, role) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.emp);
    return { role, candidates: matches };
  });

  return { impacts, vacancies, newRoles, removedCount, filledByMatching };
}

function matchScore(emp: Employee, role: RoleNode): number {
  let score = 0;
  // Level match
  if (emp.level === role.level) score += 5;
  else if (Math.abs(emp.level - role.level) === 1) score += 2;
  // Department match
  if (emp.department === role.department) score += 3;
  // Title token overlap
  const empTokens = emp.title.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  const roleTokens = role.title.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  for (const t of empTokens) if (roleTokens.includes(t)) score += 2;
  return score;
}

export function scenarioFromEmployees(name: string, employees: Employee[]): Scenario {
  const nodes: Record<string, RoleNode> = {};
  for (const e of employees) {
    nodes[e.employee_id] = {
      id: e.employee_id,
      title: e.title,
      department: e.department,
      level: e.level,
      manager_id: e.manager_id,
      assignedEmployeeId: e.employee_id,
      isNewRole: false,
    };
  }
  return { id: crypto.randomUUID(), name, nodes };
}
