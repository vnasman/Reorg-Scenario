import { useRef, useState } from 'react';
import { useApp, initialCollapsed } from '../store/useStore';
import { downloadSampleExcel, downloadEmptyTemplate, parseExcelFile, EXPECTED_COLUMNS } from '../utils/excel';
import { generateSampleEmployees } from '../data/sampleData';
import { scenarioFromEmployees } from '../utils/analysis';
import type { Employee } from '../types';

export function Upload() {
  const { setEmployees, resetScenarios, setActiveScenarioId, setView, setCollapsedFor } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      const emps = await parseExcelFile(file);
      if (!emps.length) {
        setError('Filen verkar tom.');
        return;
      }
      loadEmployees(emps);
    } catch (e) {
      setError(`Kunde inte läsa filen: ${(e as Error).message}`);
    }
  }

  function loadEmployees(emps: Employee[]) {
    setEmployees(emps);
    const baseScenario = scenarioFromEmployees('Nuläge (kopia)', emps);
    resetScenarios([baseScenario]);
    setActiveScenarioId(baseScenario.id);

    const empItems = emps.map((e) => ({ id: e.employee_id, manager_id: e.manager_id }));
    setCollapsedFor('asis', initialCollapsed(empItems));
    const scenarioItems = Object.values(baseScenario.nodes).map((n) => ({ id: n.id, manager_id: n.manager_id }));
    setCollapsedFor(baseScenario.id, initialCollapsed(scenarioItems));

    setView('asis');
  }

  function useSampleData() {
    const emps = generateSampleEmployees();
    loadEmployees(emps);
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="text-3xl font-medium tracking-tight text-ink-900">Organisationsdesign</h1>
      <p className="mt-3 text-ink-500 leading-relaxed">
        Ladda upp en personalfil från ditt HRIS för att bygga as-is-schema, designa to-be-varianter och se påverkan på medarbetare.
      </p>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="group rounded-xl border border-ink-300 bg-white p-6 cursor-pointer hover:border-ink-900 transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
        >
          <div className="text-sm font-medium text-ink-900">Ladda upp Excel</div>
          <div className="mt-2 text-sm text-ink-500">Dra hit eller klicka för att välja .xlsx</div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>

        <div className="rounded-xl border border-ink-300 bg-white p-6">
          <div className="text-sm font-medium text-ink-900">Använd exempeldata</div>
          <div className="mt-2 text-sm text-ink-500">Mid-size Nordisk SaaS, ~50 anställda, 5 nivåer.</div>
          <button
            onClick={useSampleData}
            className="mt-4 text-sm rounded-md border border-ink-900 bg-ink-900 text-white px-3 py-1.5 hover:bg-ink-700 transition-colors"
          >
            Ladda exempeldata
          </button>
        </div>
      </div>

      {error && <div className="mt-4 text-sm text-red-700">{error}</div>}

      <div className="mt-10 border-t border-ink-300 pt-6">
        <div className="text-xs uppercase tracking-wider text-ink-500">Mallar</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={downloadEmptyTemplate}
            className="text-sm rounded-md border border-ink-300 px-3 py-1.5 hover:border-ink-900 transition-colors"
          >
            Ladda ner tom mall
          </button>
          <button
            onClick={downloadSampleExcel}
            className="text-sm rounded-md border border-ink-300 px-3 py-1.5 hover:border-ink-900 transition-colors"
          >
            Ladda ner exempelfil (med data)
          </button>
        </div>

        <div className="mt-6 text-xs uppercase tracking-wider text-ink-500">Förväntade kolumner</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXPECTED_COLUMNS.map((c) => (
            <span key={c} className="font-mono text-[11px] bg-ink-100 text-ink-700 px-1.5 py-0.5 rounded">
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
