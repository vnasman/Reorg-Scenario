import * as XLSX from 'xlsx';
import type { Employee } from '../types';
import { generateSampleEmployees } from '../data/sampleData';
import type { RawSheet } from './mapping';

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
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  XLSX.writeFile(wb, 'employee-file-sample.xlsx');
}

export function downloadEmptyTemplate(): void {
  const ws = XLSX.utils.json_to_sheet(
    [
      {
        employee_id: 'E001',
        name: 'Example Name',
        title: 'CEO',
        manager_id: '',
        department: 'Leadership',
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
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  XLSX.writeFile(wb, 'employee-file-template.xlsx');
}

// Reads the first sheet without interpreting columns — used by the mapping
// step so any HRIS export can be mapped onto the Employee shape.
export async function readRawSheet(file: File): Promise<RawSheet> {
  // CSV: read as text so UTF-8 (å/ä/ö) decodes correctly — SheetJS otherwise assumes Latin-1
  const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
  const wb = isCsv
    ? XLSX.read(await file.text(), { type: 'string', cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
    raw: true,
  });
  const headerRow = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, range: 0 })[0] ?? [];
  const headers = (headerRow as unknown[]).map((h) => String(h ?? '').trim()).filter(Boolean);
  return { fileName: file.name, headers, rows };
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
    name: str('name', 'Unknown'),
    title: str('title', 'Role'),
    manager_id: mgr === '' || mgr.toLowerCase() === 'null' ? null : mgr,
    department: str('department', 'Other'),
    location: str('location', 'Unknown'),
    hire_date: str('hire_date'),
    salary: num('salary'),
    fte: num('fte', 1),
    gender: (gender === 'F' || gender === 'M' || gender === 'X' ? gender : 'X') as 'F' | 'M' | 'X',
    birth_year: num('birth_year'),
    level: num('level', 5),
  };
}
