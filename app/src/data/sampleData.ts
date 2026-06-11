import type { Employee } from '../types';

// Hand-crafted org of 54 LotR characters mapped to roles at a mid-size Nordic SaaS company.
// Galadriel as CEO, the Fellowship as C-suite, dwarves in finance/backend, elves on the
// frontend, ents running platform, Saruman watching the data (via palantír).

let rngState = 42;
function rand(): number {
  rngState = (rngState * 9301 + 49297) % 233280;
  return rngState / 233280;
}
function randInt(min: number, max: number) { return Math.floor(rand() * (max - min + 1)) + min; }

type Spec = {
  id: string;
  name: string;
  gender: 'F' | 'M';
  title: string;
  manager_id: string | null;
  department: string;
  level: number;
  location: string;
};

const SPECS: Spec[] = [
  // Level 1 — CEO
  { id: 'E001', name: 'Galadriel of Lothlórien', gender: 'F', title: 'CEO', manager_id: null, department: 'Leadership', level: 1, location: 'Lothlórien' },

  // Level 2 — Executive team
  { id: 'E002', name: 'Elrond Halfelven', gender: 'M', title: 'CTO', manager_id: 'E001', department: 'Engineering', level: 2, location: 'Rivendell' },
  { id: 'E003', name: 'Thorin Oakenshield', gender: 'M', title: 'CFO', manager_id: 'E001', department: 'Finance', level: 2, location: 'Erebor' },
  { id: 'E004', name: 'Frodo Baggins', gender: 'M', title: 'CPO', manager_id: 'E001', department: 'Product', level: 2, location: 'Hobbiton' },
  { id: 'E005', name: 'Aragorn Elessar', gender: 'M', title: 'CRO', manager_id: 'E001', department: 'Sales', level: 2, location: 'Minas Tirith' },
  { id: 'E006', name: 'Arwen Undómiel', gender: 'F', title: 'CMO', manager_id: 'E001', department: 'Marketing', level: 2, location: 'Rivendell' },
  { id: 'E007', name: 'Samwise Gamgee', gender: 'M', title: 'CHRO', manager_id: 'E001', department: 'HR', level: 2, location: 'Hobbiton' },

  // Level 3 — Department heads
  // Engineering
  { id: 'E010', name: 'Gimli son of Glóin', gender: 'M', title: 'Engineering Manager Backend', manager_id: 'E002', department: 'Engineering', level: 3, location: 'Erebor' },
  { id: 'E011', name: 'Legolas Greenleaf', gender: 'M', title: 'Engineering Manager Frontend', manager_id: 'E002', department: 'Engineering', level: 3, location: 'Mirkwood' },
  { id: 'E012', name: 'Treebeard Fangorn', gender: 'M', title: 'Engineering Manager Platform', manager_id: 'E002', department: 'Engineering', level: 3, location: 'Fangorn' },
  { id: 'E013', name: 'Saruman the White', gender: 'M', title: 'Head of Data', manager_id: 'E002', department: 'Engineering', level: 3, location: 'Isengard' },
  // Product
  { id: 'E020', name: 'Faramir of Gondor', gender: 'M', title: 'Head of Product', manager_id: 'E004', department: 'Product', level: 3, location: 'Minas Tirith' },
  { id: 'E021', name: 'Éowyn of Rohan', gender: 'F', title: 'Head of Design', manager_id: 'E004', department: 'Product', level: 3, location: 'Edoras' },
  // Sales
  { id: 'E030', name: 'Boromir of Gondor', gender: 'M', title: 'Sales Director Nordic', manager_id: 'E005', department: 'Sales', level: 3, location: 'Minas Tirith' },
  { id: 'E031', name: 'Éomer Éadig', gender: 'M', title: 'Sales Director DACH', manager_id: 'E005', department: 'Sales', level: 3, location: 'Edoras' },
  { id: 'E032', name: 'Bilbo Baggins', gender: 'M', title: 'Head of Customer Success', manager_id: 'E005', department: 'Sales', level: 3, location: 'Hobbiton' },
  // Marketing
  { id: 'E040', name: 'Théoden King', gender: 'M', title: 'Marketing Director', manager_id: 'E006', department: 'Marketing', level: 3, location: 'Edoras' },
  // Finance
  { id: 'E050', name: 'Glóin son of Gróin', gender: 'M', title: 'Finance Manager', manager_id: 'E003', department: 'Finance', level: 3, location: 'Erebor' },

  // Backend team under Gimli
  { id: 'E100', name: 'Dwalin son of Fundin', gender: 'M', title: 'Senior Backend Engineer', manager_id: 'E010', department: 'Engineering', level: 4, location: 'Erebor' },
  { id: 'E101', name: 'Balin son of Fundin', gender: 'M', title: 'Senior Backend Engineer', manager_id: 'E010', department: 'Engineering', level: 4, location: 'Erebor' },
  { id: 'E102', name: 'Óin son of Gróin', gender: 'M', title: 'Backend Engineer', manager_id: 'E010', department: 'Engineering', level: 5, location: 'Erebor' },
  { id: 'E103', name: 'Fíli son of Dís', gender: 'M', title: 'Backend Engineer', manager_id: 'E010', department: 'Engineering', level: 5, location: 'Erebor' },
  { id: 'E104', name: 'Kíli son of Dís', gender: 'M', title: 'Junior Backend Engineer', manager_id: 'E010', department: 'Engineering', level: 6, location: 'Erebor' },

  // Frontend team under Legolas
  { id: 'E110', name: 'Haldir of Lórien', gender: 'M', title: 'Senior Frontend Engineer', manager_id: 'E011', department: 'Engineering', level: 4, location: 'Lothlórien' },
  { id: 'E111', name: 'Rúmil of Lórien', gender: 'M', title: 'Frontend Engineer', manager_id: 'E011', department: 'Engineering', level: 5, location: 'Lothlórien' },
  { id: 'E112', name: 'Orophin of Lórien', gender: 'M', title: 'Frontend Engineer', manager_id: 'E011', department: 'Engineering', level: 5, location: 'Lothlórien' },
  { id: 'E113', name: 'Lindir of Rivendell', gender: 'M', title: 'Junior Frontend Engineer', manager_id: 'E011', department: 'Engineering', level: 6, location: 'Rivendell' },

  // Platform team under Treebeard
  { id: 'E120', name: 'Quickbeam Bregalad', gender: 'M', title: 'Senior Platform Engineer', manager_id: 'E012', department: 'Engineering', level: 4, location: 'Fangorn' },
  { id: 'E121', name: 'Skinbark Fladrif', gender: 'M', title: 'DevOps Engineer', manager_id: 'E012', department: 'Engineering', level: 5, location: 'Fangorn' },
  { id: 'E122', name: 'Leaflock Finglas', gender: 'M', title: 'SRE', manager_id: 'E012', department: 'Engineering', level: 5, location: 'Fangorn' },

  // Data team under Saruman
  { id: 'E130', name: 'Gríma Wormtongue', gender: 'M', title: 'Data Engineer', manager_id: 'E013', department: 'Engineering', level: 5, location: 'Isengard' },
  { id: 'E131', name: 'Radagast the Brown', gender: 'M', title: 'Data Scientist', manager_id: 'E013', department: 'Engineering', level: 5, location: 'Mirkwood' },
  { id: 'E132', name: 'Erestor of Rivendell', gender: 'M', title: 'Analytics Engineer', manager_id: 'E013', department: 'Engineering', level: 5, location: 'Rivendell' },

  // Product team under Faramir
  { id: 'E200', name: 'Imrahil of Dol Amroth', gender: 'M', title: 'Senior Product Manager', manager_id: 'E020', department: 'Product', level: 4, location: 'Minas Tirith' },
  { id: 'E201', name: 'Beregond of Minas Tirith', gender: 'M', title: 'Product Manager', manager_id: 'E020', department: 'Product', level: 5, location: 'Minas Tirith' },
  { id: 'E202', name: 'Lothíriel of Dol Amroth', gender: 'F', title: 'Product Manager', manager_id: 'E020', department: 'Product', level: 5, location: 'Minas Tirith' },

  // Design team under Éowyn
  { id: 'E210', name: 'Goldberry of Withywindle', gender: 'F', title: 'Senior Designer', manager_id: 'E021', department: 'Product', level: 4, location: 'Withywindle' },
  { id: 'E211', name: 'Tom Bombadil', gender: 'M', title: 'Designer', manager_id: 'E021', department: 'Product', level: 5, location: 'Withywindle' },

  // Sales Nordic under Boromir
  { id: 'E300', name: 'Háma of Rohan', gender: 'M', title: 'Account Executive', manager_id: 'E030', department: 'Sales', level: 5, location: 'Edoras' },
  { id: 'E301', name: 'Gamling the Old', gender: 'M', title: 'Account Executive', manager_id: 'E030', department: 'Sales', level: 5, location: 'Edoras' },
  { id: 'E302', name: 'Elfhelm of the Eastfold', gender: 'M', title: 'Account Executive', manager_id: 'E030', department: 'Sales', level: 5, location: 'Edoras' },
  { id: 'E303', name: 'Bergil son of Beregond', gender: 'M', title: 'SDR', manager_id: 'E030', department: 'Sales', level: 6, location: 'Minas Tirith' },

  // Sales DACH under Éomer
  { id: 'E310', name: 'Grimbold of Westfold', gender: 'M', title: 'Account Executive DACH', manager_id: 'E031', department: 'Sales', level: 5, location: 'Edoras' },
  { id: 'E311', name: 'Erkenbrand of Westfold', gender: 'M', title: 'SDR DACH', manager_id: 'E031', department: 'Sales', level: 6, location: 'Edoras' },

  // Customer Success under Bilbo
  { id: 'E320', name: 'Rosie Cotton', gender: 'F', title: 'Senior CSM', manager_id: 'E032', department: 'Sales', level: 4, location: 'Hobbiton' },
  { id: 'E321', name: 'Hamfast "The Gaffer" Gamgee', gender: 'M', title: 'CSM', manager_id: 'E032', department: 'Sales', level: 5, location: 'Hobbiton' },
  { id: 'E322', name: 'Tolman "Farmer" Cotton', gender: 'M', title: 'Support Specialist', manager_id: 'E032', department: 'Sales', level: 6, location: 'Hobbiton' },

  // Marketing under Théoden
  { id: 'E400', name: 'Bard the Bowman', gender: 'M', title: 'Content Lead', manager_id: 'E040', department: 'Marketing', level: 4, location: 'Dale' },
  { id: 'E401', name: 'Halbarad Dúnadan', gender: 'M', title: 'Demand Generation Manager', manager_id: 'E040', department: 'Marketing', level: 5, location: 'Bree' },
  { id: 'E402', name: 'Celeborn of Lothlórien', gender: 'M', title: 'Brand Manager', manager_id: 'E040', department: 'Marketing', level: 5, location: 'Lothlórien' },

  // Finance under Glóin
  { id: 'E500', name: 'Dáin Ironfoot', gender: 'M', title: 'Controller', manager_id: 'E050', department: 'Finance', level: 5, location: 'Erebor' },
  { id: 'E501', name: 'Bombur the Hospitable', gender: 'M', title: 'Accountant', manager_id: 'E050', department: 'Finance', level: 6, location: 'Erebor' },

  // HR under Sam
  { id: 'E600', name: 'Lobelia Sackville-Baggins', gender: 'F', title: 'HR Business Partner', manager_id: 'E007', department: 'HR', level: 4, location: 'Hobbiton' },
  { id: 'E601', name: 'Fredegar "Fatty" Bolger', gender: 'M', title: 'Talent Acquisition Specialist', manager_id: 'E007', department: 'HR', level: 5, location: 'Hobbiton' },
];

function salaryFor(level: number): number {
  const base: Record<number, [number, number]> = {
    1: [180000, 220000],
    2: [110000, 145000],
    3: [80000, 105000],
    4: [60000, 80000],
    5: [45000, 62000],
    6: [33000, 44000],
  };
  const [min, max] = base[level];
  return randInt(min / 1000, max / 1000) * 1000;
}

function ageFor(level: number): number {
  const base: Record<number, [number, number]> = {
    1: [45, 58],
    2: [40, 55],
    3: [35, 52],
    4: [32, 50],
    5: [26, 42],
    6: [22, 32],
  };
  const [min, max] = base[level];
  return randInt(min, max);
}

function hireDateFor(): string {
  const year = randInt(2014, 2025);
  const month = randInt(1, 12);
  const day = randInt(1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function generateSampleEmployees(): Employee[] {
  rngState = 42;
  const currentYear = 2026;
  return SPECS.map((s) => {
    const age = ageFor(s.level);
    return {
      employee_id: s.id,
      name: s.name,
      title: s.title,
      manager_id: s.manager_id,
      department: s.department,
      location: s.location,
      hire_date: hireDateFor(),
      salary: salaryFor(s.level),
      fte: rand() > 0.9 ? 0.8 : 1.0,
      gender: s.gender,
      birth_year: currentYear - age,
      level: s.level,
    };
  });
}
