export type Employee = {
  employee_id: string;
  name: string;
  title: string;
  manager_id: string | null;
  department: string;
  location: string;
  hire_date: string; // YYYY-MM-DD
  salary: number;
  fte: number; // 0-1
  gender: 'F' | 'M' | 'X';
  birth_year: number;
  level: number; // 1 (CEO) - 6 (IC)
};

export type RoleNode = {
  // A node in a to-be scenario. Either filled by an existing employee
  // (assignedEmployeeId), kept as a vacant role template (no assignee),
  // or marked as a brand-new role.
  id: string; // local node id
  title: string;
  department: string;
  level: number;
  manager_id: string | null; // parent node id within scenario
  assignedEmployeeId: string | null; // employee_id, or null if vacant
  isNewRole: boolean; // true = role didn't exist in as-is
  notes?: string;
};

export type Scenario = {
  id: string;
  name: string;
  nodes: Record<string, RoleNode>;
};

export type ImpactCategory =
  | 'unchanged'
  | 'new_manager'
  | 'moved'
  | 'promoted'
  | 'demoted'
  | 'removed';

export type EmployeeImpact = {
  employee_id: string;
  category: ImpactCategory;
  oldManager: string | null;
  newManager: string | null;
  oldTitle: string;
  newTitle: string | null;
  oldLevel: number;
  newLevel: number | null;
};

export type Signal = {
  severity: 'info' | 'warn' | 'risk';
  title: string;
  detail: string;
};
