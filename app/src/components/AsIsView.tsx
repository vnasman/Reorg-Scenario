import { useMemo, useState } from 'react';
import { useApp } from '../store/useStore';
import { analyzeAsIs } from '../utils/analysis';
import { EmployeeOrgChart } from './OrgChart';

function StatTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-ink-300 bg-white p-4">
      <div className="text-[11px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className="mt-1 text-2xl font-medium text-ink-900">{value}</div>
      {sub && <div className="text-xs text-ink-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function SignalChip({ severity }: { severity: 'info' | 'warn' | 'risk' }) {
  const map = {
    info: 'bg-ink-100 text-ink-700',
    warn: 'bg-amber-100 text-amber-800',
    risk: 'bg-red-100 text-red-800',
  };
  const label = { info: 'Info', warn: 'Warning', risk: 'Risk' }[severity];
  return <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${map[severity]}`}>{label}</span>;
}

export function AsIsView() {
  const { employees, collapsed, toggleCollapse } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const stats = useMemo(() => analyzeAsIs(employees), [employees]);
  const selectedEmp = selected ? employees.find((e) => e.employee_id === selected) : null;

  return (
    <div className="h-full flex">
      <div className="flex-1 min-w-0 border-r border-ink-300 bg-white">
        <EmployeeOrgChart
          employees={employees}
          onNodeClick={(id) => setSelected(id)}
          collapsedIds={collapsed['asis'] ?? []}
          onToggleCollapse={(id) => toggleCollapse('asis', id)}
        />
      </div>

      <aside className="w-[380px] shrink-0 overflow-y-auto bg-ink-100">
        <div className="p-5 space-y-5">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-500">As-is</div>
            <div className="text-lg font-medium text-ink-900 mt-1">Overview</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Headcount" value={stats.headcount} sub={`${stats.managers} managers • ${stats.ics} ICs`} />
            <StatTile label="Levels" value={stats.maxDepth} />
            <StatTile label="Span (avg)" value={stats.avgSpan.toFixed(1)} sub={`max ${stats.maxSpan}`} />
            <StatTile label="Payroll" value={`${(stats.payroll / 1000).toFixed(0)}k`} sub="per month" />
            <StatTile label="Avg age" value={stats.avgAge.toFixed(0)} sub="yrs" />
            <StatTile label="Avg tenure" value={stats.avgTenureYears.toFixed(1)} sub="yrs" />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">Departments</div>
            <div className="space-y-1">
              {stats.departments.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{d.name}</span>
                  <span className="text-ink-500 font-mono text-xs">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">Locations</div>
            <div className="space-y-1">
              {stats.locations.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{d.name}</span>
                  <span className="text-ink-500 font-mono text-xs">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">Gender split</div>
            <div className="flex h-2 rounded overflow-hidden bg-ink-300">
              {(['F', 'M', 'X'] as const).map((g) => {
                const total = stats.genderSplit.F + stats.genderSplit.M + stats.genderSplit.X;
                const w = total ? (stats.genderSplit[g] / total) * 100 : 0;
                if (w === 0) return null;
                const color = g === 'F' ? 'bg-ink-900' : g === 'M' ? 'bg-ink-500' : 'bg-ink-300';
                return <div key={g} className={color} style={{ width: `${w}%` }} title={`${g}: ${stats.genderSplit[g]}`} />;
              })}
            </div>
            <div className="mt-1 text-xs text-ink-500">
              {stats.genderSplit.F} women • {stats.genderSplit.M} men{stats.genderSplit.X ? ` • ${stats.genderSplit.X} other` : ''}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">Signals ({stats.signals.length})</div>
            <div className="space-y-2">
              {stats.signals.length === 0 && <div className="text-sm text-ink-500">No signals to raise.</div>}
              {stats.signals.map((s, i) => (
                <div key={i} className="rounded-md border border-ink-300 bg-white p-2.5">
                  <div className="flex items-center gap-2">
                    <SignalChip severity={s.severity} />
                    <div className="text-xs font-medium text-ink-900">{s.title}</div>
                  </div>
                  <div className="text-xs text-ink-500 mt-1 leading-snug">{s.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">Span of control (top)</div>
            <div className="space-y-1">
              {stats.spansByManager.slice(0, 6).map((s) => (
                <div key={s.manager_id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="text-ink-700 truncate">{s.name}</div>
                    <div className="text-[11px] text-ink-500 truncate">{s.title}</div>
                  </div>
                  <span className="font-mono text-xs text-ink-900 ml-2">{s.span}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedEmp && (
            <div className="rounded-md border border-ink-900 bg-white p-3">
              <div className="text-xs uppercase tracking-wider text-ink-500">Selected</div>
              <div className="mt-1 text-sm font-medium text-ink-900">{selectedEmp.name}</div>
              <div className="text-xs text-ink-500">{selectedEmp.title} • {selectedEmp.department}</div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div className="text-ink-500">Location</div><div className="text-ink-700">{selectedEmp.location}</div>
                <div className="text-ink-500">Level</div><div className="text-ink-700">{selectedEmp.level}</div>
                <div className="text-ink-500">FTE</div><div className="text-ink-700">{selectedEmp.fte}</div>
                <div className="text-ink-500">Salary</div><div className="text-ink-700">{selectedEmp.salary.toLocaleString('en-US')}</div>
                <div className="text-ink-500">Hired</div><div className="text-ink-700">{selectedEmp.hire_date}</div>
                <div className="text-ink-500">Birth year</div><div className="text-ink-700">{selectedEmp.birth_year}</div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
