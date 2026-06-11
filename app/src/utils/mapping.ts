import type { Employee } from '../types';

// Column mapping layer: lets any HRIS export be mapped onto the internal
// Employee shape. Auto-suggestion matches headers against synonym lists for
// common HRIS exports (Workday, SuccessFactors, Personio, BambooHR, svenska
// system). Mappings can be saved as named profiles in localStorage and are
// auto-applied when a file with the same header signature is uploaded again.

export type TargetField =
  | 'employee_id'
  | 'name'
  | 'title'
  | 'manager_id'
  | 'department'
  | 'location'
  | 'hire_date'
  | 'salary'
  | 'fte'
  | 'gender'
  | 'birth_year'
  | 'level';

export type ColumnMapping = Record<TargetField, string | null>;

export type MappingProfile = {
  id: string;
  name: string;
  headerSignature: string;
  mapping: ColumnMapping;
};

export type RawSheet = {
  fileName: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

export const FIELD_META: { field: TargetField; label: string; required: boolean; hint?: string }[] = [
  { field: 'employee_id', label: 'Anställnings-ID', required: true },
  { field: 'name', label: 'Namn', required: true },
  { field: 'manager_id', label: 'Chefens ID', required: true, hint: 'Bygger hierarkin — tom cell = toppnivå' },
  { field: 'title', label: 'Titel', required: false },
  { field: 'department', label: 'Avdelning', required: false },
  { field: 'location', label: 'Ort', required: false },
  { field: 'hire_date', label: 'Anställningsdatum', required: false },
  { field: 'salary', label: 'Månadslön', required: false },
  { field: 'fte', label: 'FTE / Sysselsättningsgrad', required: false, hint: '0–1 eller procent' },
  { field: 'gender', label: 'Kön', required: false },
  { field: 'birth_year', label: 'Födelseår', required: false, hint: 'Årtal eller födelsedatum' },
  { field: 'level', label: 'Nivå', required: false, hint: 'Härleds från hierarkin om den inte mappas' },
];

const SYNONYMS: Record<TargetField, string[]> = {
  employee_id: ['employee_id', 'employee id', 'employeeid', 'emp id', 'empid', 'worker id', 'workerid', 'employee number', 'employee no', 'personnel number', 'staff id', 'anställningsnummer', 'anst nr', 'anstnr', 'medarbetar id', 'medarbetarid', 'personalnummer', 'id'],
  name: ['name', 'full name', 'fullname', 'employee name', 'worker', 'display name', 'legal name', 'namn', 'fullständigt namn', 'medarbetare'],
  title: ['title', 'job title', 'jobtitle', 'position', 'position title', 'job', 'role', 'befattning', 'titel', 'tjänst', 'roll', 'befattningstitel'],
  manager_id: ['manager_id', 'manager id', 'managerid', 'supervisor id', 'supervisorid', 'reports to', 'reports to id', 'manager employee id', 'line manager id', 'chef id', 'chefid', 'chefens id', 'närmaste chef', 'manager', 'chef', 'supervisor', 'överordnad'],
  department: ['department', 'dept', 'org unit', 'orgunit', 'organizational unit', 'organisation', 'organization', 'business unit', 'division', 'team', 'avdelning', 'enhet', 'funktion', 'organisationsenhet'],
  location: ['location', 'office', 'site', 'city', 'work location', 'workplace', 'ort', 'kontor', 'plats', 'stad', 'arbetsort', 'arbetsplats'],
  hire_date: ['hire_date', 'hire date', 'hiredate', 'start date', 'startdate', 'employment date', 'original hire date', 'date of hire', 'anställningsdatum', 'startdatum', 'anställd sedan', 'anställd'],
  salary: ['salary', 'base salary', 'monthly salary', 'base pay', 'pay', 'compensation', 'lön', 'månadslön', 'grundlön', 'baslön'],
  fte: ['fte', 'full time equivalent', 'employment fraction', 'work percentage', 'sysselsättningsgrad', 'tjänstgöringsgrad', 'omfattning', 'arbetstid'],
  gender: ['gender', 'sex', 'legal gender', 'legal sex', 'kön', 'juridiskt kön'],
  birth_year: ['birth_year', 'birth year', 'birthyear', 'year of birth', 'födelseår', 'born', 'birth date', 'birthdate', 'date of birth', 'dob', 'födelsedatum', 'född'],
  level: ['level', 'job level', 'grade', 'job grade', 'band', 'management level', 'career level', 'nivå', 'befattningsnivå', 'chefsnivå', 'karriärnivå'],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[_\-./]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping = Object.fromEntries(FIELD_META.map((f) => [f.field, null])) as ColumnMapping;
  const used = new Set<string>();
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  // Pass 1: exact synonym match
  for (const { field } of FIELD_META) {
    const syns = SYNONYMS[field];
    const hit = normalized.find((h) => !used.has(h.raw) && syns.includes(h.norm));
    if (hit) {
      mapping[field] = hit.raw;
      used.add(hit.raw);
    }
  }

  // Pass 2: header contains a synonym (longest synonyms first to avoid
  // 'id' swallowing 'manager id'-style headers)
  for (const { field } of FIELD_META) {
    if (mapping[field]) continue;
    const syns = [...SYNONYMS[field]].filter((s) => s.length >= 4).sort((a, b) => b.length - a.length);
    const hit = normalized.find((h) => !used.has(h.raw) && syns.some((s) => h.norm.includes(s)));
    if (hit) {
      mapping[field] = hit.raw;
      used.add(hit.raw);
    }
  }

  return mapping;
}

// --- Value converters -------------------------------------------------------

function fmtDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function excelSerialToDate(n: number): Date {
  return new Date(Math.round((n - 25569) * 86400 * 1000));
}

function toISODate(v: unknown): string {
  if (v == null || v === '') return '';
  if (v instanceof Date && !isNaN(v.getTime())) return fmtDate(v);
  if (typeof v === 'number') {
    if (v > 20000 && v < 80000) return fmtDate(excelSerialToDate(v));
    return '';
  }
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime())) return fmtDate(d);
  return s;
}

function toYear(v: unknown): number {
  if (v == null || v === '') return 0;
  if (v instanceof Date && !isNaN(v.getTime())) return v.getFullYear();
  const n = Number(v);
  if (Number.isFinite(n)) {
    if (n >= 1900 && n <= 2030) return Math.round(n);
    if (n > 20000 && n < 80000) return excelSerialToDate(n).getFullYear();
    return 0;
  }
  const d = new Date(String(v).trim());
  if (!isNaN(d.getTime())) return d.getFullYear();
  return 0;
}

function toNumber(v: unknown, fallback: number): number {
  if (v == null || v === '') return fallback;
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  const cleaned = String(v).replace(/[^0-9.,\-]/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

function toFte(v: unknown): number {
  const n = toNumber(v, 1);
  if (n > 1 && n <= 100) return n / 100; // "80" eller "80%" → 0.8
  if (n <= 0 || n > 1) return 1;
  return n;
}

function toGender(v: unknown): 'F' | 'M' | 'X' {
  if (v == null) return 'X';
  const s = String(v).trim().toLowerCase();
  if (['f', 'k', 'kvinna', 'female', 'woman', 'w'].includes(s)) return 'F';
  if (['m', 'man', 'male'].includes(s)) return 'M';
  return 'X';
}

// --- Apply ------------------------------------------------------------------

export function applyMapping(sheet: RawSheet, mapping: ColumnMapping): Employee[] {
  const get = (row: Record<string, unknown>, field: TargetField): unknown => {
    const col = mapping[field];
    return col ? row[col] : null;
  };
  const str = (row: Record<string, unknown>, field: TargetField, fallback = ''): string => {
    const v = get(row, field);
    return v == null ? fallback : String(v).trim();
  };

  const employees: Employee[] = sheet.rows.map((row, idx) => {
    const mgr = str(row, 'manager_id');
    return {
      employee_id: str(row, 'employee_id') || `RAD${String(idx + 1).padStart(3, '0')}`,
      name: str(row, 'name', 'Okänd'),
      title: str(row, 'title', 'Roll'),
      manager_id: mgr === '' || mgr.toLowerCase() === 'null' ? null : mgr,
      department: str(row, 'department', 'Övrigt'),
      location: str(row, 'location', 'Okänd'),
      hire_date: toISODate(get(row, 'hire_date')),
      salary: toNumber(get(row, 'salary'), 0),
      fte: mapping.fte ? toFte(get(row, 'fte')) : 1,
      gender: toGender(get(row, 'gender')),
      birth_year: toYear(get(row, 'birth_year')),
      level: Math.round(toNumber(get(row, 'level'), 0)),
    };
  });

  // Skip rows that are entirely empty (no id source and no name)
  const filtered = employees.filter((e) => e.name !== 'Okänd' || !e.employee_id.startsWith('RAD'));

  if (!mapping.level) deriveLevels(filtered);
  else for (const e of filtered) if (e.level < 1 || e.level > 6) e.level = 5;

  return filtered;
}

// Derive level from hierarchy depth when the file has no level column:
// roots = 1, each step down +1, capped at 6.
function deriveLevels(emps: Employee[]): void {
  const byId = new Map(emps.map((e) => [e.employee_id, e]));
  const memo = new Map<string, number>();
  function depth(id: string, seen: Set<string>): number {
    if (memo.has(id)) return memo.get(id)!;
    const e = byId.get(id);
    if (!e || !e.manager_id || !byId.has(e.manager_id) || seen.has(id)) {
      memo.set(id, 1);
      return 1;
    }
    seen.add(id);
    const d = Math.min(6, depth(e.manager_id, seen) + 1);
    memo.set(id, d);
    return d;
  }
  for (const e of emps) e.level = depth(e.employee_id, new Set());
}

// --- Profiles (localStorage) ------------------------------------------------

const PROFILES_KEY = 'orgdesign.mappingProfiles';

export function headerSignature(headers: string[]): string {
  return [...headers].map(normalizeHeader).sort().join('|');
}

export function loadProfiles(): MappingProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProfile(profile: MappingProfile): void {
  const all = loadProfiles().filter((p) => p.id !== profile.id);
  all.push(profile);
  localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
}

export function deleteProfile(id: string): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(loadProfiles().filter((p) => p.id !== id)));
}

export function findProfileBySignature(headers: string[]): MappingProfile | null {
  const sig = headerSignature(headers);
  return loadProfiles().find((p) => p.headerSignature === sig) ?? null;
}
