import * as XLSX from 'xlsx';
import type { Employee } from '../types';
import { generateSampleEmployees } from '../data/sampleData';

export const EXPECTED_COLUMNS = [
  'employee_id',
  'name',
  'title',
  'manager_id',
  'department',
  'location',
  'hire_date',
  'salary',
  'fte',
  'gender',
  'birth_year',
  'level',
] as const;

export function downloadSampleExcel(): void {
  const employees = generateSampleEmployees();
  const ws = XLSX.utils.json_to_sheet(employees, { header: [...EXPECTED_COLUMNS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Personalfil');
  XLSX.writeFile(wb, 'personalfil-mall.xlsx');
}

export function downloadEmptyTemplate(): void {
  const ws = XLSX.utils.json_to_sheet(
    [
      {
        employee_id: 'E001',
        name: 'Exempel Namn',
        title: 'VD',
        manager_id: '',
        department: 'Ledning',
        location: 'Stockholm',
        hire_date: '2020-01-15',
        salary: 200000,
        fte: 1,
        gender: 'F',
        birth_year: 1975,
        level: 1,
      },
    ],
    { header: [...EXPECTED_COLUMNS] },
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Personalfil');
  XLSX.writeFile(wb, 'personalfil-tom-mall.xlsx');
}

export async function parseExcelFile(file: File): Promise<Employee[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
    raw: true,
  });

  return rows.map((r, i) => normalizeRow(r, i));
}

function normalizeRow(r: Record<string, unknown>, idx: number): Employee {
  const get = (key: string): unknown => {
    const exact = r[key];
    if (exact !== undefined && exact !== null && exact !== '') return exact;
    const lowerKey = key.toLowerCase();
    for (const k of Object.keys(r)) {
      if (k.toLowerCase().trim() === lowerKey) return r[k];
    }
    return null;
  };

  const str = (k: string, fallback = ''): string => {
    const v = get(k);
    return v == null ? fallback : String(v).trim();
  };
  const num = (k: string, fallback = 0): number => {
    const v = get(k);
    if (v == null || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const mgr = str('manager_id');
  const gender = str('gender').toUpperCase();
  return {
    employee_id: str('employee_id') || `E${String(idx + 1).padStart(3, '0')}`,
    name: str('name', 'Okänd'),
    title: str('title', 'Roll'),
    manager_id: mgr === '' || mgr.toLowerCase() === 'null' ? null : mgr,
    department: str('department', 'Övrigt'),
    location: str('location', 'Okänd'),
    hire_date: str('hire_date'),
    salary: num('salary'),
    fte: num('fte', 1),
    gender: (gender === 'F' || gender === 'M' || gender === 'X' ? gender : 'X') as 'F' | 'M' | 'X',
    birth_year: num('birth_year'),
    level: num('level', 5),
  };
}
