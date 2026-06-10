import { useMemo, useState } from 'react';
import { useApp } from '../store/useStore';
import { computeImpact, analyzeAsIs, analyzeScenario, type ScenarioStats } from '../utils/analysis';
import type { ImpactCategory, Signal } from '../types';

const categoryMeta: Record<ImpactCategory, { label: string; color: string }> = {
  unchanged: { label: 'Oförändrad', color: 'bg-ink-100 text-ink-700' },
  new_manager: { label: 'Ny chef', color: 'bg-blue-50 text-blue-800' },
  moved: { label: 'Omplacerad', color: 'bg-amber-50 text-amber-800' },
  promoted: { label: 'Befordrad', color: 'bg-emerald-50 text-emerald-800' },
  demoted: { label: 'Nedflyttad', color: 'bg-orange-50 text-orange-800' },
  removed: { label: 'Övertalig', color: 'bg-red-50 text-red-800' },
};

export function ImpactView() {
  const { employees, scenarios } = useApp();
  const [filter, setFilter] = useState<ImpactCategory | 'all'>('all');
  const [comparisonIds, setComparisonIds] = useState<string[]>(() => scenarios.slice(0, 1).map((s) => s.id));

  const asIsStats = useMemo(() => analyzeAsIs(employees), [employees]);

  const summaries = useMemo(() => {
    return scenarios.map((s) => {
      const result = computeImpact(employees, s);
      const counts: Record<ImpactCategory, number> = {
        unchanged: 0, new_manager: 0, moved: 0, promoted: 0, demoted: 0, removed: 0,
      };
      for (const i of result.impacts) counts[i.category]++;
      const stats = analyzeScenario(s, employees);
      return { scenario: s, result, counts, stats };
    });
  }, [scenarios, employees]);

  function toggleCompare(id: string) {
    setComparisonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="h-full overflow-auto bg-ink-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-500">Påverkan</div>
            <div className="text-lg font-medium text-ink-900">Konsekvens per scenario</div>
          </div>
          <div className="text-xs text-ink-500">Markera scenarier för att jämföra detaljer</div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {summaries.map(({ scenario, result, counts }) => {
            const active = comparisonIds.includes(scenario.id);
            return (
              <div
                key={scenario.id}
                onClick={() => toggleCompare(scenario.id)}
                className={`cursor-pointer rounded-lg border bg-white p-4 transition-colors ${
                  active ? 'border-ink-900' : 'border-ink-300 hover:border-ink-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-ink-900">{scenario.name}</div>
                  <input type="checkbox" checked={active} readOnly />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {(Object.entries(counts) as [ImpactCategory, number][]).map(([cat, n]) => (
                    <div key={cat} className="flex justify-between">
                      <span className="text-ink-500">{categoryMeta[cat].label}</span>
                      <span className="font-mono text-ink-900">{n}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-ink-100 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-ink-500">Vakanser</div>
                    <div className="font-mono text-ink-900 mt-0.5">{result.vacancies.length}</div>
                  </div>
                  <div>
                    <div className="text-ink-500">Nya roller</div>
                    <div className="font-mono text-ink-900 mt-0.5">{result.newRoles.length}</div>
                  </div>
                  <div>
                    <div className="text-ink-500">Övertaliga</div>
                    <div className="font-mono text-ink-900 mt-0.5">{result.removedCount}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Strukturell analys */}
        {comparisonIds.length > 0 && (
          <StructuralAnalysis
            asIs={asIsStats}
            scenarios={summaries.filter((s) => comparisonIds.includes(s.scenario.id))}
          />
        )}

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-2.5 py-1 rounded-full border ${
              filter === 'all' ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-300 text-ink-700'
            }`}
          >
            Alla
          </button>
          {(Object.keys(categoryMeta) as ImpactCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                filter === c ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-300 text-ink-700'
              }`}
            >
              {categoryMeta[c].label}
            </button>
          ))}
        </div>

        {/* Comparison table */}
        {comparisonIds.length > 0 && (
          <div className="rounded-lg border border-ink-300 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-300 flex items-center justify-between">
              <div className="text-sm font-medium">Påverkan per individ</div>
              <div className="text-xs text-ink-500">{employees.length} personer</div>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-100 border-b border-ink-300">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500">
                    <th className="px-3 py-2">Namn</th>
                    <th className="px-3 py-2">Nuvarande roll</th>
                    {summaries.filter((s) => comparisonIds.includes(s.scenario.id)).map(({ scenario }) => (
                      <th key={scenario.id} className="px-3 py-2 border-l border-ink-300">{scenario.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => {
                    const selected = summaries.filter((s) => comparisonIds.includes(s.scenario.id));
                    const cats = selected.map((s) => s.result.impacts.find((i) => i.employee_id === e.employee_id));
                    if (filter !== 'all' && !cats.some((c) => c?.category === filter)) return null;
                    return (
                      <tr key={e.employee_id} className="border-b border-ink-100">
                        <td className="px-3 py-2">
                          <div className="text-ink-900">{e.name}</div>
                          <div className="text-[11px] text-ink-500">{e.department}</div>
                        </td>
                        <td className="px-3 py-2 text-ink-500">{e.title}</td>
                        {cats.map((c, idx) => (
                          <td key={idx} className="px-3 py-2 border-l border-ink-100">
                            {c ? <ImpactCell category={c.category} newTitle={c.newTitle} newLevel={c.newLevel} oldLevel={c.oldLevel} /> : <span className="text-ink-500">—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vacancy matching */}
        {comparisonIds.length > 0 && (
          <div className="space-y-4">
            {summaries
              .filter((s) => comparisonIds.includes(s.scenario.id))
              .map(({ scenario, result }) => (
                <div key={scenario.id} className="rounded-lg border border-ink-300 bg-white">
                  <div className="px-4 py-3 border-b border-ink-300 text-sm font-medium">
                    Vakanser i {scenario.name} ({result.vacancies.length})
                  </div>
                  <div className="p-3 space-y-2">
                    {result.vacancies.length === 0 && <div className="text-xs text-ink-500 p-2">Inga vakanser.</div>}
                    {result.filledByMatching.map(({ role, candidates }) => (
                      <div key={role.id} className="rounded border border-ink-100 p-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-ink-900">{role.title}</div>
                            <div className="text-[11px] text-ink-500">
                              {role.department} • Nivå {role.level}
                              {role.isNewRole && <span className="ml-1 text-emerald-700">• Ny roll</span>}
                            </div>
                          </div>
                          <div className="text-[11px] text-ink-500">{candidates.length} förslag</div>
                        </div>
                        {candidates.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {candidates.map((c) => (
                              <span key={c.employee_id} className="text-[11px] bg-ink-100 text-ink-700 px-2 py-0.5 rounded-full">
                                {c.name} <span className="text-ink-500">• {c.title}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {candidates.length === 0 && <div className="mt-1 text-[11px] text-ink-500 italic">Ingen tydlig intern kandidat — extern rekrytering troligen.</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ImpactCell({ category, newTitle, newLevel, oldLevel }: { category: ImpactCategory; newTitle: string | null; newLevel: number | null; oldLevel: number }) {
  const meta = categoryMeta[category];
  return (
    <div>
      <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.color}`}>{meta.label}</span>
      {newTitle && <div className="text-xs text-ink-700 mt-1 truncate">{newTitle}</div>}
      {newLevel !== null && newLevel !== oldLevel && (
        <div className="text-[10px] text-ink-500">nivå {oldLevel} → {newLevel}</div>
      )}
    </div>
  );
}

type StructuralRow = {
  label: string;
  asIs: number;
  values: number[];
  fmt?: (n: number) => string;
  fmtDelta?: (delta: number) => string;
  // Direction the delta should be visually "positive": 1 = up is good, -1 = down is good, 0 = neutral
  betterWhen?: 1 | -1 | 0;
};

function StructuralAnalysis({
  asIs,
  scenarios,
}: {
  asIs: ReturnType<typeof analyzeAsIs>;
  scenarios: { scenario: { id: string; name: string }; stats: ScenarioStats }[];
}) {
  const nf = (n: number) => n.toLocaleString('sv-SE');
  const decimal = (n: number) => n.toFixed(1).replace('.', ',');
  const money = (n: number) => `${Math.round(n / 1000)}k`;
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const rows: StructuralRow[] = [
    { label: 'Roller totalt', asIs: asIs.headcount, values: scenarios.map((s) => s.stats.totalRoles), fmt: nf, betterWhen: 0 },
    { label: 'Besatta', asIs: asIs.headcount, values: scenarios.map((s) => s.stats.filled), fmt: nf, betterWhen: 1 },
    { label: 'Vakanser', asIs: 0, values: scenarios.map((s) => s.stats.vacancies), fmt: nf, betterWhen: -1 },
    { label: 'Nya roller', asIs: 0, values: scenarios.map((s) => s.stats.newRoles), fmt: nf, betterWhen: 0 },
    { label: 'Övertaliga', asIs: 0, values: scenarios.map((s) => s.stats.removed), fmt: nf, betterWhen: -1 },
    { label: 'Chefer', asIs: asIs.managers, values: scenarios.map((s) => s.stats.managers), fmt: nf, betterWhen: 0 },
    { label: 'Nivåer (djup)', asIs: asIs.maxDepth, values: scenarios.map((s) => s.stats.maxDepth), fmt: nf, betterWhen: -1 },
    { label: 'Span snitt', asIs: asIs.avgSpan, values: scenarios.map((s) => s.stats.avgSpan), fmt: decimal, fmtDelta: (d) => (d > 0 ? '+' : '') + decimal(d), betterWhen: 0 },
    { label: 'Span max', asIs: asIs.maxSpan, values: scenarios.map((s) => s.stats.maxSpan), fmt: nf, betterWhen: -1 },
    { label: 'Lönekostnad/mån', asIs: asIs.payroll, values: scenarios.map((s) => s.stats.payroll), fmt: money, fmtDelta: (d) => (d > 0 ? '+' : '') + money(Math.abs(d) * Math.sign(d)), betterWhen: -1 },
    { label: 'Snittålder', asIs: asIs.avgAge, values: scenarios.map((s) => s.stats.avgAge), fmt: (n) => n.toFixed(0), fmtDelta: (d) => (d > 0 ? '+' : '') + d.toFixed(1).replace('.', ','), betterWhen: 0 },
    { label: 'Snittanställning', asIs: asIs.avgTenureYears, values: scenarios.map((s) => s.stats.avgTenureYears), fmt: decimal, fmtDelta: (d) => (d > 0 ? '+' : '') + decimal(d), betterWhen: 0 },
  ];

  // Diff signals
  const asIsSignalTitles = new Set(asIs.signals.map((s) => s.title));

  return (
    <div className="rounded-lg border border-ink-300 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-300 text-sm font-medium">Strukturell analys</div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 border-b border-ink-300">
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500">
              <th className="px-3 py-2">Mått</th>
              <th className="px-3 py-2 text-right">Nuläge</th>
              {scenarios.map(({ scenario }) => (
                <th key={scenario.id} className="px-3 py-2 text-right border-l border-ink-300">
                  {scenario.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-ink-100">
                <td className="px-3 py-2 text-ink-700">{row.label}</td>
                <td className="px-3 py-2 text-right font-mono text-ink-900">{row.fmt?.(row.asIs) ?? row.asIs}</td>
                {row.values.map((v, i) => {
                  const delta = v - row.asIs;
                  return (
                    <td key={i} className="px-3 py-2 text-right border-l border-ink-100">
                      <span className="font-mono text-ink-900">{row.fmt?.(v) ?? v}</span>
                      {Math.abs(delta) > 0.0001 && (
                        <DeltaBadge delta={delta} fmtDelta={row.fmtDelta} betterWhen={row.betterWhen ?? 0} fmtAbs={row.fmt} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Könsfördelning */}
            <tr className="border-b border-ink-100">
              <td className="px-3 py-2 text-ink-700">Andel kvinnor</td>
              <td className="px-3 py-2 text-right font-mono text-ink-900">
                {pct(genderFShare(asIs.genderSplit))}
              </td>
              {scenarios.map(({ scenario, stats }) => {
                const s = genderFShare(stats.genderSplit);
                const delta = s - genderFShare(asIs.genderSplit);
                return (
                  <td key={scenario.id} className="px-3 py-2 text-right border-l border-ink-100">
                    <span className="font-mono text-ink-900">{pct(s)}</span>
                    {Math.abs(delta) > 0.005 && (
                      <DeltaBadge
                        delta={delta}
                        fmtDelta={(d) => (d > 0 ? '+' : '') + `${Math.round(d * 100)}pp`}
                        betterWhen={0}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Avdelningar */}
      <DistributionSection
        title="Avdelningar"
        asIsBuckets={asIs.departments}
        scenarioBuckets={scenarios.map((s) => ({ id: s.scenario.id, name: s.scenario.name, buckets: s.stats.departments }))}
      />

      {/* Orter */}
      <DistributionSection
        title="Orter (besatta)"
        asIsBuckets={asIs.locations}
        scenarioBuckets={scenarios.map((s) => ({ id: s.scenario.id, name: s.scenario.name, buckets: s.stats.locations }))}
      />

      {/* Signaler */}
      <div className="border-t border-ink-300 px-4 py-3">
        <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">Signaler</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <SignalsColumn title="Nuläge" signals={asIs.signals} />
          {scenarios.map(({ scenario, stats }) => (
            <SignalsColumn
              key={scenario.id}
              title={scenario.name}
              signals={stats.signals}
              decorate={(sig) => (!asIsSignalTitles.has(sig.title) ? 'new' : 'existing')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function genderFShare(g: { F: number; M: number; X: number }): number {
  const total = g.F + g.M;
  if (total === 0) return 0;
  return g.F / total;
}

function DeltaBadge({
  delta,
  fmtDelta,
  betterWhen,
  fmtAbs,
}: {
  delta: number;
  fmtDelta?: (n: number) => string;
  betterWhen: 1 | -1 | 0;
  fmtAbs?: (n: number) => string;
}) {
  const positive = delta > 0;
  const isGood = betterWhen !== 0 && (positive ? betterWhen === 1 : betterWhen === -1);
  const isBad = betterWhen !== 0 && !isGood;
  const color = isGood ? 'text-emerald-700' : isBad ? 'text-red-700' : 'text-ink-500';
  const arrow = positive ? '↑' : '↓';
  const formatted = fmtDelta
    ? fmtDelta(delta)
    : (delta > 0 ? '+' : '') + (fmtAbs ? fmtAbs(Math.abs(delta)) : Math.abs(delta));
  return <span className={`ml-1.5 text-[10px] font-mono ${color}`}>{arrow} {formatted.replace(/^[+-]?/, '')}</span>;
}

function DistributionSection({
  title,
  asIsBuckets,
  scenarioBuckets,
}: {
  title: string;
  asIsBuckets: { name: string; count: number }[];
  scenarioBuckets: { id: string; name: string; buckets: { name: string; count: number }[] }[];
}) {
  // Gather all bucket names across as-is + scenarios
  const allNames = new Set<string>(asIsBuckets.map((b) => b.name));
  for (const s of scenarioBuckets) for (const b of s.buckets) allNames.add(b.name);
  const sortedNames = [...allNames].sort((a, b) => {
    const aCount = asIsBuckets.find((x) => x.name === a)?.count ?? 0;
    const bCount = asIsBuckets.find((x) => x.name === b)?.count ?? 0;
    return bCount - aCount;
  });

  return (
    <div className="border-t border-ink-300 px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500">
            <th className="py-1"></th>
            <th className="py-1 text-right">Nuläge</th>
            {scenarioBuckets.map((s) => (
              <th key={s.id} className="py-1 text-right pl-3">{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedNames.map((name) => {
            const asIsCount = asIsBuckets.find((b) => b.name === name)?.count ?? 0;
            return (
              <tr key={name}>
                <td className="py-1 text-ink-700">{name}</td>
                <td className="py-1 text-right font-mono text-ink-900">{asIsCount || '—'}</td>
                {scenarioBuckets.map((s) => {
                  const c = s.buckets.find((b) => b.name === name)?.count ?? 0;
                  const delta = c - asIsCount;
                  return (
                    <td key={s.id} className="py-1 text-right pl-3">
                      <span className="font-mono text-ink-900">{c || '—'}</span>
                      {delta !== 0 && (
                        <span className={`ml-1.5 text-[10px] font-mono ${delta > 0 ? 'text-ink-500' : 'text-ink-500'}`}>
                          {delta > 0 ? '+' : ''}{delta}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SignalsColumn({
  title,
  signals,
  decorate,
}: {
  title: string;
  signals: Signal[];
  decorate?: (sig: Signal) => 'new' | 'existing';
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-500 mb-1">{title}</div>
      {signals.length === 0 && <div className="text-xs text-ink-500 italic">Inga signaler.</div>}
      <div className="space-y-1.5">
        {signals.map((s, i) => {
          const decoration = decorate?.(s);
          const ring =
            decoration === 'new' ? 'border-emerald-400' : decoration === 'existing' ? 'border-ink-300' : 'border-ink-300';
          return (
            <div key={i} className={`rounded-md border ${ring} p-2`}>
              <div className="flex items-center gap-1.5">
                <SignalChip severity={s.severity} />
                <div className="text-[11px] font-medium text-ink-900 truncate">{s.title}</div>
                {decoration === 'new' && <span className="text-[9px] uppercase tracking-wider text-emerald-700">Ny</span>}
              </div>
              <div className="text-[11px] text-ink-500 mt-0.5 leading-snug">{s.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SignalChip({ severity }: { severity: 'info' | 'warn' | 'risk' }) {
  const map = {
    info: 'bg-ink-100 text-ink-700',
    warn: 'bg-amber-100 text-amber-800',
    risk: 'bg-red-100 text-red-800',
  };
  const label = { info: 'Info', warn: 'Varning', risk: 'Risk' }[severity];
  return <span className={`text-[9px] uppercase tracking-wider px-1 py-0.5 rounded ${map[severity]}`}>{label}</span>;
}
