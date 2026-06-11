# Reorg-Scenario

A tool for quickly iterating organization design variants and seeing the impact on employees. Upload an employee file (Excel) from your HRIS — the tool builds the as-is chart, lets you design to-be scenarios side by side, and shows consequences per individual plus structural deltas.

Everything runs client-side. No server, no database, no data leaves the browser.

## Quick start

```bash
cd app
npm install
npm run dev
```

Opens at `http://localhost:5173`. Click **Load sample data** to try it with 54 Lord of the Rings characters in a mid-size SaaS org.

Alternatively: double-click `Start organization design.command` in Finder (macOS).

## Stack

- **Vite 8 + React 19 + TypeScript** — SPA, no backend
- **Tailwind 3** — utility CSS
- **React Flow 11** — the org chart
- **SheetJS** — Excel parsing
- No other dependencies of note

## Folder structure

```
app/
  src/
    types.ts                  Employee, RoleNode, Scenario, impact types
    main.tsx                  Entry
    App.tsx                   Root + state provider
    index.css                 Global styles + Tailwind directives

    store/
      useStore.ts             AppContext + useApp() + initialCollapsed()

    data/
      sampleData.ts           54 LotR specs + procedural salary/age

    utils/
      excel.ts                readRawSheet, template downloads
      mapping.ts              Column mapping: auto-suggestion, converters,
                              saved profiles (localStorage)
      layout.ts               Custom tree layout (postorder width, preorder x)
      analysis.ts             analyzeAsIs, analyzeScenario,
                              computeImpact, matchScore, scenarioFromEmployees

    components/
      Upload.tsx              Source data view
      MappingPanel.tsx        Column mapping step (any HRIS export)
      AsIsView.tsx            As-is view (chart + analysis sidebar)
      ToBeView.tsx            To-be editor (scenario tabs, chart/table, undo)
      ImpactView.tsx          Impact view (per-individual, structural deltas, vacancies)
      OrgChart.tsx            React Flow wrappers + collapse/expand + focus
```

## Data model

Everything rests on two layers:

### Layer 1: `Employee[]` — the employee file

Real people with fixed identity. Loaded once, never mutated.

```ts
type Employee = {
  employee_id: string;
  name: string;
  title: string;
  manager_id: string | null;  // builds the tree
  department: string;
  location: string;
  hire_date: string;          // YYYY-MM-DD
  salary: number;
  fte: number;
  gender: 'F' | 'M' | 'X';
  birth_year: number;
  level: number;              // 1 (CEO) → 6 (junior IC)
};
```

### Layer 2: `Scenario[]` — to-be variants

Each scenario is a separate graph of **roles**, not people:

```ts
type RoleNode = {
  id: string;                          // local node id within the scenario
  title: string;
  department: string;
  level: number;
  manager_id: string | null;           // points at another RoleNode.id
  assignedEmployeeId: string | null;   // points at Employee.employee_id, or null = vacant
  isNewRole: boolean;                  // role that did not exist in as-is
};

type Scenario = {
  id: string;
  name: string;
  nodes: Record<string, RoleNode>;
};
```

**Why two layers?** A role can exist without being filled (vacancy). A person can be missing from a scenario (redundant). The gap between the layers is what the impact analysis measures.

## State architecture

All global state lives in `useState` in `App.tsx`, exposed through an `AppContext`:

```ts
employees           Employee[]
scenarios           Scenario[]
history             Scenario[][]                  // undo stack (max 50 steps)
collapsed           Record<key, string[]>         // collapsed nodes per view
activeScenarioId
view                'upload' | 'asis' | 'tobe' | 'impact'
```

**Mutations go through `commitScenarios(next)`** which pushes the previous state onto `history`. `undo()` pops. `resetScenarios()` exists for operations that should not create an undo step (e.g. renaming a scenario).

**Collapse state is keyed per view:** `'asis'` for the as-is view, the scenario id for to-be views, so every scenario keeps its own collapsed nodes.

**Default collapse**: `initialCollapsed()` returns all nodes *with* children *except* the root — so the chart opens with the CEO + first level visible.

## Column mapping (HRIS imports)

Uploads go through a mapping step (`MappingPanel.tsx` + `utils/mapping.ts`):

- Headers are auto-matched against synonym lists for common HRIS exports (Workday, SuccessFactors, Personio, BambooHR + Swedish-language systems). Both English and Swedish header names are recognized.
- The user adjusts via dropdowns with a live preview of the first five converted rows.
- Mappings can be saved as named profiles (localStorage). A file with the same header signature auto-applies its profile on the next upload.
- Required fields: employee ID, name, manager ID. Everything else is optional with sensible defaults.
- If no level column is mapped, level is derived from hierarchy depth (top = 1, capped at 6).
- Converters normalize dates (Excel serials, Date objects, strings), FTE percentages ("80" → 0.8), gender values and number formats. CSV is read as UTF-8.

## Analysis layer

All analysis logic lives in `utils/analysis.ts`. Three main functions:

### `analyzeAsIs(employees) → AsIsStats`

Computes on `Employee[]`. Builds a reports map from `manager_id`, runs DFS for depth, sums histograms (department, location, gender), demographics (age, tenure, payroll), and applies signal rules:

- Span ≥ 9 → warning
- Span = 1 → info (possible flattening)
- Depth ≥ 5 → warning (slow decisions)
- Female share outside 35–65% → info (skewed split)

### `analyzeScenario(scenario, employees) → ScenarioStats`

Same shape as `AsIsStats` plus `{ totalRoles, filled, vacancies, newRoles, removed }`. Structural metrics (span, depth) are computed across all nodes. Demographics only count filled roles via `assignedEmployeeId` lookup.

### `computeImpact(employees, scenario) → { impacts, vacancies, newRoles, removedCount, filledByMatching }`

Builds a `Map<employee_id, RoleNode>` of assigned people in the scenario. Iterates every `Employee` and classifies them as:

- `unchanged` — same manager, title, level
- `new_manager` — same role but a new manager
- `moved` — new department or title
- `promoted` — lower `level` number
- `demoted` — higher `level` number
- `removed` — not present in the scenario (shown as "Redundant")

Vacancy matching uses `matchScore(emp, role)`:
- exact level: 5 pts, ±1: 2 pts
- department match: 3 pts
- title token overlap: 2 pts per token

Top 5 candidates are shown per vacancy.

## Layout algorithm

`utils/layout.ts` is a custom two-pass algorithm (not Walker's):

1. **Postorder** — compute each subtree's width: `max(NODE_W, sum(children widths) + gaps)`
2. **Preorder** — assign `x` so children center under their parent; `y = depth × (NODE_H + Y_GAP)`

Result: `LaidOutNode[] { id, x, y, parentId }` mapped to React Flow `Node[]` + `Edge[]`. Edges are `smoothstep`.

**Collapse** works by filtering out all descendants of collapsed nodes *before* layout runs.

## How to extend

### Add a new field to the employee file

1. Add the field to the `Employee` type in `types.ts`
2. Add it to `FIELD_META` and the synonym lists in `utils/mapping.ts`
3. Add a converter in `applyMapping()` if the value needs normalization
4. (Optional) add the column to `sampleData.ts` so the sample data carries a value

### Add a new analysis / signal

In `utils/analysis.ts`:

- For as-is: add the computation + signal rule in `analyzeAsIs()`
- For scenarios: do the same in `analyzeScenario()` so it shows with a delta on the Impact tab
- For a new metric that should get a delta row: add a `StructuralRow` in the `StructuralAnalysis` component in `ImpactView.tsx`

### Add a new impact category

- Add the value to the `ImpactCategory` union in `types.ts`
- Define the classification rule in `computeImpact()` in `analysis.ts`
- Add metadata to `categoryMeta` in `ImpactView.tsx`

### Add a new view

1. Add the value to the `view` union in `useStore.ts`
2. Create the component in `components/`
3. Add a `NavLink` + render block in `App.tsx`

### Build for production

```bash
npm run build
```

Generates `dist/` with static HTML/CSS/JS. Deploys on any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages). A `netlify.toml` is included — connecting the repo to Netlify auto-deploys `main`.

## Known limitations and ideas

- **Bundle size** is ~820 kB (~265 kB gzipped) — React Flow + SheetJS account for most of it. Could be reduced by dynamically importing SheetJS (only needed on the Source data tab).
- **Drag-and-drop in the chart** is not implemented — editing happens through the sidebar or the table view. React Flow supports drag-and-drop, so it is mostly UX design that is missing.
- **No persistence** — refresh resets everything. Consider mirroring `scenarios` to `localStorage` in `App.tsx`. (Mapping profiles *are* persisted.)
- **No export** — exporting a scenario to Excel/PDF for sharing would be valuable.
- **No tests** — built as a prototype. For serious use, start with unit tests on `analysis.ts` and `mapping.ts` (pure functions, easy to test).
- **Matching is primitive** — only level + department + title tokens. Could be extended with competence fields, location preference, salary bands.

## License

None specified — free to use within reason.
