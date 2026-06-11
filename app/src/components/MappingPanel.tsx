import { useMemo, useState } from 'react';
import type { Employee } from '../types';
import {
  FIELD_META,
  applyMapping,
  deleteProfile,
  findProfileBySignature,
  headerSignature,
  loadProfiles,
  saveProfile,
  suggestMapping,
  type ColumnMapping,
  type MappingProfile,
  type RawSheet,
  type TargetField,
} from '../utils/mapping';

export function MappingPanel({
  sheet,
  onImport,
  onCancel,
}: {
  sheet: RawSheet;
  onImport: (employees: Employee[]) => void;
  onCancel: () => void;
}) {
  const matchedProfile = useMemo(() => findProfileBySignature(sheet.headers), [sheet.headers]);
  const [mapping, setMapping] = useState<ColumnMapping>(() => matchedProfile?.mapping ?? suggestMapping(sheet.headers));
  const [profiles, setProfiles] = useState<MappingProfile[]>(() => loadProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string | null>(matchedProfile?.id ?? null);
  const [saveAsProfile, setSaveAsProfile] = useState(false);
  const [profileName, setProfileName] = useState('');

  const missingRequired = FIELD_META.filter((f) => f.required && !mapping[f.field]);

  const duplicateIds = useMemo(() => {
    const col = mapping.employee_id;
    if (!col) return 0;
    const seen = new Set<string>();
    let dups = 0;
    for (const row of sheet.rows) {
      const v = String(row[col] ?? '').trim();
      if (!v) continue;
      if (seen.has(v)) dups++;
      else seen.add(v);
    }
    return dups;
  }, [mapping.employee_id, sheet.rows]);

  const preview = useMemo(() => {
    try {
      return applyMapping({ ...sheet, rows: sheet.rows.slice(0, 5) }, mapping);
    } catch {
      return [];
    }
  }, [sheet, mapping]);

  function setField(field: TargetField, col: string | null) {
    setMapping((m) => {
      const next = { ...m, [field]: col };
      // A source column can only map to one field — release it from any other
      if (col) {
        for (const f of FIELD_META) {
          if (f.field !== field && next[f.field] === col) next[f.field] = null;
        }
      }
      return next;
    });
    setActiveProfileId(null);
  }

  function applyProfile(id: string) {
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    setMapping(p.mapping);
    setActiveProfileId(id);
  }

  function removeProfile(id: string) {
    deleteProfile(id);
    setProfiles(loadProfiles());
    if (activeProfileId === id) setActiveProfileId(null);
  }

  function doImport() {
    if (missingRequired.length > 0) return;
    if (saveAsProfile && profileName.trim()) {
      saveProfile({
        id: crypto.randomUUID(),
        name: profileName.trim(),
        headerSignature: headerSignature(sheet.headers),
        mapping,
      });
    }
    onImport(applyMapping(sheet, mapping));
  }

  const exampleFor = (col: string | null): string => {
    if (!col) return '';
    for (const row of sheet.rows) {
      const v = row[col];
      if (v != null && String(v).trim() !== '') {
        const s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
        return s.length > 24 ? s.slice(0, 24) + '…' : s;
      }
    }
    return '';
  };

  return (
    <div className="mt-12">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-ink-500">Column mapping</div>
          <div className="mt-1 text-sm text-ink-700">
            <span className="font-medium text-ink-900">{sheet.fileName}</span> • {sheet.rows.length} rows • {sheet.headers.length} columns
          </div>
        </div>
        <button onClick={onCancel} className="text-sm text-ink-500 hover:text-ink-900">
          Cancel
        </button>
      </div>

      {matchedProfile && activeProfileId === matchedProfile.id && (
        <div className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          Recognized this file format — the profile "{matchedProfile.name}" was applied automatically.
        </div>
      )}

      {profiles.length > 0 && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-ink-500">Saved profiles:</span>
          {profiles.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1">
              <button
                onClick={() => applyProfile(p.id)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  activeProfileId === p.id ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-300 text-ink-700 hover:border-ink-900'
                }`}
              >
                {p.name}
              </button>
              <button onClick={() => removeProfile(p.id)} className="text-ink-300 hover:text-red-600 text-xs" title="Delete profile">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-ink-300 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-100 border-b border-ink-300">
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink-500">
              <th className="px-3 py-2">Field</th>
              <th className="px-3 py-2">Column in file</th>
              <th className="px-3 py-2">Example value</th>
            </tr>
          </thead>
          <tbody>
            {FIELD_META.map((f) => (
              <tr key={f.field} className="border-b border-ink-100 last:border-0">
                <td className="px-3 py-2">
                  <span className="text-ink-900">{f.label}</span>
                  {f.required && <span className="text-red-600 ml-0.5">*</span>}
                  {f.hint && <div className="text-[11px] text-ink-500">{f.hint}</div>}
                </td>
                <td className="px-3 py-2">
                  <select
                    value={mapping[f.field] ?? ''}
                    onChange={(e) => setField(f.field, e.target.value || null)}
                    className={`w-full text-sm border rounded px-2 py-1 bg-white ${
                      f.required && !mapping[f.field] ? 'border-red-300' : 'border-ink-300'
                    }`}
                  >
                    <option value="">— Don't map</option>
                    {sheet.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs text-ink-500 font-mono truncate max-w-[180px]">{exampleFor(mapping[f.field])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {missingRequired.length > 0 && (
        <div className="mt-3 text-xs text-red-700">
          Required fields missing: {missingRequired.map((f) => f.label).join(', ')}
        </div>
      )}
      {duplicateIds > 0 && (
        <div className="mt-2 text-xs text-amber-700">
          Warning: {duplicateIds} duplicate employee IDs in the file — later rows do not overwrite earlier ones, but the hierarchy may come out wrong.
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">Preview</div>
          <div className="rounded-xl border border-ink-300 bg-white overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-ink-100 border-b border-ink-300">
                <tr className="text-left text-[10px] uppercase tracking-wider text-ink-500">
                  <th className="px-2 py-1.5">ID</th>
                  <th className="px-2 py-1.5">Name</th>
                  <th className="px-2 py-1.5">Title</th>
                  <th className="px-2 py-1.5">Manager</th>
                  <th className="px-2 py-1.5">Department</th>
                  <th className="px-2 py-1.5">Location</th>
                  <th className="px-2 py-1.5">Salary</th>
                  <th className="px-2 py-1.5">FTE</th>
                  <th className="px-2 py-1.5">Gender</th>
                  <th className="px-2 py-1.5">Birth year</th>
                  <th className="px-2 py-1.5">Level</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((e) => (
                  <tr key={e.employee_id} className="border-b border-ink-100 last:border-0">
                    <td className="px-2 py-1.5 font-mono">{e.employee_id}</td>
                    <td className="px-2 py-1.5">{e.name}</td>
                    <td className="px-2 py-1.5">{e.title}</td>
                    <td className="px-2 py-1.5 font-mono">{e.manager_id ?? '—'}</td>
                    <td className="px-2 py-1.5">{e.department}</td>
                    <td className="px-2 py-1.5">{e.location}</td>
                    <td className="px-2 py-1.5">{e.salary ? e.salary.toLocaleString('en-US') : '—'}</td>
                    <td className="px-2 py-1.5">{e.fte}</td>
                    <td className="px-2 py-1.5">{e.gender}</td>
                    <td className="px-2 py-1.5">{e.birth_year || '—'}</td>
                    <td className="px-2 py-1.5">{e.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!mapping.level && <div className="mt-1.5 text-[11px] text-ink-500">Level is derived from the manager hierarchy (top = 1).</div>}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={doImport}
          disabled={missingRequired.length > 0}
          className={`text-sm rounded-md px-4 py-2 transition-colors ${
            missingRequired.length > 0
              ? 'bg-ink-300 text-white cursor-not-allowed'
              : 'bg-ink-900 text-white hover:bg-ink-700'
          }`}
        >
          Import {sheet.rows.length} people
        </button>

        <label className="flex items-center gap-2 text-xs text-ink-700">
          <input type="checkbox" checked={saveAsProfile} onChange={(e) => setSaveAsProfile(e.target.checked)} />
          Save mapping as profile
        </label>
        {saveAsProfile && (
          <input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Profile name, e.g. Workday export"
            className="text-sm border border-ink-300 rounded px-2 py-1.5 w-56"
          />
        )}
      </div>
    </div>
  );
}
