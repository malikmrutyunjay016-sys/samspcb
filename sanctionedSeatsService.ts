import { db, doc, getDoc, setDoc } from '../firebase';
import { Student } from '../types';

export const STORAGE_KEY_CURRENT = 'SAMS_SANCTIONED_SEATS_MAP';
export const STORAGE_KEY_DEFAULT = 'SAMS_DEFAULT_SANCTIONED_SEATS';
export const STORAGE_KEY_META = 'SAMS_SANCTIONED_SEATS_META';

/**
 * Benchmark 2026 Odisha Higher Education Department sanctioned seats for Panchayat College, Bargarh.
 * AEDP subjects are 8 specialized industry-oriented courses.
 * Regular Honours covers 20 traditional subjects.
 */
export const ORIGINAL_GOVT_BASE_STRENGTHS: Record<string, number> = {
  // AEDP Specialized Subjects (8)
  'AEDP-ENG': 24,
  'AEDP-HIST': 24,
  'AEDP-ECO': 24,
  'AEDP-COM': 64,
  'AEDP-BOT': 16,
  'AEDP-ZOO': 16,
  'AEDP-MATH': 16,
  'AEDP-CHEM': 16,

  // Regular Honours & Core Subjects (20)
  'H-ENG': 64,
  'H-HIST': 64,
  'H-ECO': 64,
  'H-POL': 64,
  'H-HIN': 64,
  'H-ODI': 64,
  'H-EDU': 64,
  'H-SOC': 64,
  'H-GEO': 48,
  'H-PHI': 48,
  'H-SAN': 48,
  'H-PSY': 32,
  'H-COM': 128,
  'H-BOT': 32,
  'H-ZOO': 32,
  'H-PHY': 48,
  'H-CHE': 48,
  'H-MAT': 32,
  'H-STA': 32,
  'SF-CS': 64,
};

export interface SubjectDefinition {
  code: string;
  name: string;
  stream: string;
  isAedp: boolean;
  baseStrength: number;
}

export interface SanctionedSeatsMeta {
  lastUpdated?: string;
  updatedBy?: string;
  isDefault?: boolean;
  totalStrength?: number;
}

export const ALL_SUBJECT_DEFINITIONS: SubjectDefinition[] = [
  // --- AEDP Specialized Subjects (8 subjects) ---
  {
    code: 'AEDP-ENG',
    name: 'B.A in English and Translation & digital humanities (AEDP)',
    stream: 'Arts',
    isAedp: true,
    baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['AEDP-ENG'] ?? 24
  },
  {
    code: 'AEDP-HIST',
    name: 'B.A in History with Tourism and Hospitality Operations (AEDP)',
    stream: 'Arts',
    isAedp: true,
    baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['AEDP-HIST'] ?? 24
  },
  {
    code: 'AEDP-ECO',
    name: 'B.A in Economics and data analytics (AEDP)',
    stream: 'Arts',
    isAedp: true,
    baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['AEDP-ECO'] ?? 24
  },
  {
    code: 'AEDP-COM',
    name: 'B.Com in Banking, Financial Services and Insurance and Commerce (AEDP)',
    stream: 'Commerce',
    isAedp: true,
    baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['AEDP-COM'] ?? 64
  },
  {
    code: 'AEDP-BOT',
    name: 'B.SC in Botany with Tissue culture and vertical gardening (AEDP)',
    stream: 'Biological Science',
    isAedp: true,
    baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['AEDP-BOT'] ?? 16
  },
  {
    code: 'AEDP-ZOO',
    name: 'B.SC in Zoology and integrative bioscience (AEDP)',
    stream: 'Biological Science',
    isAedp: true,
    baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['AEDP-ZOO'] ?? 16
  },
  {
    code: 'AEDP-MATH',
    name: 'B.Sc. in Mathematics & Computing (AEDP)',
    stream: 'Physical Science',
    isAedp: true,
    baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['AEDP-MATH'] ?? 16
  },
  {
    code: 'AEDP-CHEM',
    name: 'B.SC in Chemistry and Industrial Chemistry (AEDP)',
    stream: 'Physical Science',
    isAedp: true,
    baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['AEDP-CHEM'] ?? 16
  },

  // --- Regular Honours & Core Subjects (20 subjects) ---
  { code: 'H-ENG', name: 'English', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-ENG'] ?? 64 },
  { code: 'H-HIST', name: 'History', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-HIST'] ?? 64 },
  { code: 'H-ECO', name: 'Economics', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-ECO'] ?? 64 },
  { code: 'H-POL', name: 'Political Science', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-POL'] ?? 64 },
  { code: 'H-HIN', name: 'Hindi', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-HIN'] ?? 64 },
  { code: 'H-ODI', name: 'Odia', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-ODI'] ?? 64 },
  { code: 'H-EDU', name: 'Education', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-EDU'] ?? 64 },
  { code: 'H-SOC', name: 'Sociology', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-SOC'] ?? 64 },
  { code: 'H-GEO', name: 'Geography', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-GEO'] ?? 48 },
  { code: 'H-PHI', name: 'Philosophy', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-PHI'] ?? 48 },
  { code: 'H-SAN', name: 'Sanskrit', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-SAN'] ?? 48 },
  { code: 'H-PSY', name: 'Psychology', stream: 'Arts', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-PSY'] ?? 32 },
  { code: 'H-COM', name: 'Commerce', stream: 'Commerce', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-COM'] ?? 128 },
  { code: 'H-BOT', name: 'Botany', stream: 'Biological Science', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-BOT'] ?? 32 },
  { code: 'H-ZOO', name: 'Zoology', stream: 'Biological Science', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-ZOO'] ?? 32 },
  { code: 'H-PHY', name: 'Physics', stream: 'Physical Science', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-PHY'] ?? 48 },
  { code: 'H-CHE', name: 'Chemistry', stream: 'Physical Science', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-CHE'] ?? 48 },
  { code: 'H-MAT', name: 'Mathematics', stream: 'Physical Science', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-MAT'] ?? 32 },
  { code: 'H-STA', name: 'Statistics', stream: 'Physical Science', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['H-STA'] ?? 32 },
  { code: 'SF-CS', name: 'Computer Science', stream: 'Self Financing', isAedp: false, baseStrength: ORIGINAL_GOVT_BASE_STRENGTHS['SF-CS'] ?? 64 }
];

export function matchesSubjectDefinition(studentSubject: string, subDef: SubjectDefinition): boolean {
  if (!studentSubject) return false;
  const sNorm = studentSubject.trim().toLowerCase();
  const defNameNorm = subDef.name.trim().toLowerCase();

  // 1. Exact match
  if (sNorm === defNameNorm) return true;

  // 2. AEDP subjects check
  if (subDef.isAedp) {
    if (!sNorm.includes('aedp')) return false;
    if (subDef.code === 'AEDP-ENG' && sNorm.includes('english')) return true;
    if (subDef.code === 'AEDP-HIST' && sNorm.includes('history')) return true;
    if (subDef.code === 'AEDP-ECO' && sNorm.includes('econ')) return true;
    if (subDef.code === 'AEDP-COM' && (sNorm.includes('commerce') || sNorm.includes('banking') || sNorm.includes('insurance'))) return true;
    if (subDef.code === 'AEDP-BOT' && sNorm.includes('botan')) return true;
    if (subDef.code === 'AEDP-ZOO' && sNorm.includes('zool')) return true;
    if (subDef.code === 'AEDP-MATH' && sNorm.includes('math')) return true;
    if (subDef.code === 'AEDP-CHEM' && sNorm.includes('chem')) return true;
    return false;
  }

  // 3. Regular Honours subjects check (must NOT be an AEDP student)
  if (sNorm.includes('aedp')) return false;

  if (subDef.code === 'H-ENG' && (sNorm === 'english' || sNorm === 'h-eng' || sNorm.includes('english honours'))) return true;
  if (subDef.code === 'H-HIST' && (sNorm === 'history' || sNorm === 'h-hist')) return true;
  if (subDef.code === 'H-ECO' && (sNorm === 'economics' || sNorm === 'h-eco')) return true;
  if (subDef.code === 'H-POL' && (sNorm === 'political science' || sNorm.includes('political') || sNorm === 'h-pol')) return true;
  if (subDef.code === 'H-HIN' && (sNorm === 'hindi' || sNorm === 'h-hin')) return true;
  if (subDef.code === 'H-ODI' && (sNorm === 'odia' || sNorm === 'h-odi')) return true;
  if (subDef.code === 'H-EDU' && (sNorm === 'education' || sNorm === 'h-edu')) return true;
  if (subDef.code === 'H-SOC' && (sNorm === 'sociology' || sNorm === 'h-soc')) return true;
  if (subDef.code === 'H-GEO' && (sNorm === 'geography' || sNorm === 'h-geo')) return true;
  if (subDef.code === 'H-PHI' && (sNorm === 'philosophy' || sNorm === 'h-phi')) return true;
  if (subDef.code === 'H-SAN' && (sNorm === 'sanskrit' || sNorm === 'h-san')) return true;
  if (subDef.code === 'H-PSY' && (sNorm === 'psychology' || sNorm === 'h-psy')) return true;
  if (subDef.code === 'H-COM' && (sNorm === 'commerce' || sNorm === 'h-com')) return true;
  if (subDef.code === 'H-BOT' && (sNorm === 'botany' || sNorm === 'h-bot')) return true;
  if (subDef.code === 'H-ZOO' && (sNorm === 'zoology' || sNorm === 'h-zoo')) return true;
  if (subDef.code === 'H-PHY' && (sNorm === 'physics' || sNorm === 'h-phy')) return true;
  if (subDef.code === 'H-CHE' && (sNorm === 'chemistry' || sNorm === 'h-che')) return true;
  if (subDef.code === 'H-MAT' && (sNorm === 'mathematics' || sNorm === 'h-mat')) return true;
  if (subDef.code === 'H-STA' && (sNorm === 'statistics' || sNorm === 'h-sta')) return true;
  if (subDef.code === 'SF-CS' && (sNorm.includes('computer science') || sNorm === 'sf-cs')) return true;

  return sNorm.includes(defNameNorm) || defNameNorm.includes(sNorm);
}

/**
 * Returns saved default sanctioned seats mapping.
 * Reads from localStorage, falling back to ORIGINAL_GOVT_BASE_STRENGTHS.
 */
export const getDefaultSanctionedSeats = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEFAULT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
        return { ...ORIGINAL_GOVT_BASE_STRENGTHS, ...parsed };
      }
    }
  } catch (e) {
    console.error('Error reading default sanctioned seats:', e);
  }
  return { ...ORIGINAL_GOVT_BASE_STRENGTHS };
};

/**
 * Returns saved sanctioned seats mapping (subject code -> sanctioned seats number).
 * Reads synchronously from localStorage for 0ms latency.
 */
export const getSavedSanctionedSeats = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading saved sanctioned seats:', e);
  }
  // If no current override exists, fallback to saved default
  return getDefaultSanctionedSeats();
};

/**
 * Returns metadata about the saved default seats
 */
export const getSanctionedSeatsMeta = (): SanctionedSeatsMeta => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_META);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading sanctioned seats meta:', e);
  }
  return {};
};

/**
 * Saves sanctioned seats mapping and automatically establishes it as the college default.
 */
export const saveSanctionedSeatsAsDefault = (
  seatsMap: Record<string, number>,
  userName: string = 'Admin'
): void => {
  const meta: SanctionedSeatsMeta = {
    lastUpdated: new Date().toISOString(),
    updatedBy: userName,
    isDefault: true,
    totalStrength: Object.values(seatsMap).reduce((acc, curr) => acc + (Number(curr) || 0), 0)
  };

  try {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(seatsMap));
    localStorage.setItem(STORAGE_KEY_DEFAULT, JSON.stringify(seatsMap));
    localStorage.setItem(STORAGE_KEY_META, JSON.stringify(meta));
  } catch (e) {
    console.error('Error writing default sanctioned seats to localStorage:', e);
  }

  // Non-blocking firestore sync
  try {
    const docRef = doc(db, 'systemSettings', 'sanctionedSeats');
    setDoc(docRef, {
      seats: seatsMap,
      defaultSeats: seatsMap,
      lastUpdated: meta.lastUpdated,
      updatedBy: userName,
      isDefault: true,
      totalStrength: meta.totalStrength
    }, { merge: true }).catch(err => {
      console.warn('Non-blocking Firestore sync for sanctioned seats warning:', err);
    });
  } catch (err) {
    console.warn('Error initiating Firestore write for sanctioned seats:', err);
  }
};

/**
 * Saves sanctioned seats mapping synchronously to localStorage
 * and asynchronously syncs with Firestore in the background.
 */
export const saveSanctionedSeats = (
  seatsMap: Record<string, number>,
  userName: string = 'Admin',
  makeDefault: boolean = true
): void => {
  if (makeDefault) {
    saveSanctionedSeatsAsDefault(seatsMap, userName);
    return;
  }

  const meta: SanctionedSeatsMeta = {
    lastUpdated: new Date().toISOString(),
    updatedBy: userName,
    isDefault: false
  };

  try {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(seatsMap));
    localStorage.setItem(STORAGE_KEY_META, JSON.stringify(meta));
  } catch (e) {
    console.error('Error writing sanctioned seats to localStorage:', e);
  }

  // Non-blocking firestore sync
  try {
    const docRef = doc(db, 'systemSettings', 'sanctionedSeats');
    setDoc(docRef, {
      seats: seatsMap,
      lastUpdated: meta.lastUpdated,
      updatedBy: userName,
      isDefault: false
    }, { merge: true }).catch(err => {
      console.warn('Non-blocking Firestore sync for sanctioned seats warning:', err);
    });
  } catch (err) {
    console.warn('Error initiating Firestore write for sanctioned seats:', err);
  }
};

/**
 * Checks Firestore for any remotely saved sanctioned seats updates
 */
export const fetchRemoteSanctionedSeats = async (): Promise<{
  currentSeats: Record<string, number>;
  defaultSeats: Record<string, number>;
  meta?: SanctionedSeatsMeta;
} | null> => {
  try {
    const docRef = doc(db, 'systemSettings', 'sanctionedSeats');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data) {
        const currentSeats = (data.seats && typeof data.seats === 'object') ? data.seats : null;
        const defaultSeats = (data.defaultSeats && typeof data.defaultSeats === 'object') ? data.defaultSeats : currentSeats;

        if (defaultSeats) {
          localStorage.setItem(STORAGE_KEY_DEFAULT, JSON.stringify(defaultSeats));
        }
        if (currentSeats) {
          localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(currentSeats));
        }
        if (data.lastUpdated) {
          const meta: SanctionedSeatsMeta = {
            lastUpdated: data.lastUpdated,
            updatedBy: data.updatedBy || 'Admin',
            isDefault: Boolean(data.isDefault),
            totalStrength: data.totalStrength
          };
          localStorage.setItem(STORAGE_KEY_META, JSON.stringify(meta));
          return { currentSeats: currentSeats || defaultSeats, defaultSeats: defaultSeats || currentSeats, meta };
        }
        return { currentSeats: currentSeats || defaultSeats, defaultSeats: defaultSeats || currentSeats };
      }
    }
  } catch (e) {
    console.warn('Could not fetch remote sanctioned seats:', e);
  }
  return null;
};

/**
 * Resets current seats back to the saved default sanctioned seats
 */
export const resetToSavedDefaults = (): Record<string, number> => {
  const defaultSeats = getDefaultSanctionedSeats();
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(defaultSeats));
  } catch (e) {
    console.error('Error resetting to saved default seats in localStorage:', e);
  }
  return defaultSeats;
};

/**
 * Resets all custom sanctioned seats and saved defaults back to Government benchmark
 */
export const resetToGovtBenchmark = (userName: string = 'Admin'): Record<string, number> => {
  try {
    localStorage.removeItem(STORAGE_KEY_CURRENT);
    localStorage.removeItem(STORAGE_KEY_DEFAULT);
    localStorage.removeItem(STORAGE_KEY_META);
  } catch (e) {
    console.error('Error resetting sanctioned seats in localStorage:', e);
  }

  return { ...ORIGINAL_GOVT_BASE_STRENGTHS };
};

export interface DepartmentSeatSummary {
  departmentName: string;
  regularCourseName: string;
  regularSanctioned: number;
  regularEnrolled: number;
  aedpCourseName?: string;
  aedpSanctioned: number;
  aedpEnrolled: number;
  totalIntakeCapacity: number;
  totalEnrolled: number;
  totalVacancies: number;
}

/**
 * Calculates department intake capacity by adding regular honours and corresponding AEDP course sanctioned seats.
 */
export function getDepartmentIntakeSummary(
  deptNameOrSubject: string,
  sanctionedSeatsMap?: Record<string, number>,
  students: Student[] = []
): DepartmentSeatSummary {
  const map = sanctionedSeatsMap || getSavedSanctionedSeats();
  const norm = deptNameOrSubject.toLowerCase().replace(/^department of /i, '').trim();

  // Find regular honours subject definition
  const regularSub = ALL_SUBJECT_DEFINITIONS.find(s => {
    if (s.isAedp) return false;
    const nameLower = s.name.toLowerCase();
    if (norm === 'computer science' && s.code === 'SF-CS') return true;
    if (norm === 'odia' && s.code === 'H-ODI') return true;
    if (norm === 'english' && s.code === 'H-ENG') return true;
    if (norm === 'hindi' && s.code === 'H-HIN') return true;
    if (norm === 'sanskrit' && s.code === 'H-SAN') return true;
    if (norm === 'history' && s.code === 'H-HIST') return true;
    if (norm === 'political science' && s.code === 'H-POL') return true;
    if (norm === 'economics' && s.code === 'H-ECO') return true;
    if (norm === 'philosophy' && s.code === 'H-PHI') return true;
    if (norm === 'sociology' && s.code === 'H-SOC') return true;
    if (norm === 'education' && s.code === 'H-EDU') return true;
    if (norm === 'psychology' && s.code === 'H-PSY') return true;
    if (norm === 'geography' && s.code === 'H-GEO') return true;
    if (norm === 'physics' && s.code === 'H-PHY') return true;
    if (norm === 'chemistry' && s.code === 'H-CHE') return true;
    if (norm === 'mathematics' && s.code === 'H-MAT') return true;
    if (norm === 'statistics' && s.code === 'H-STA') return true;
    if (norm === 'botany' && s.code === 'H-BOT') return true;
    if (norm === 'zoology' && s.code === 'H-ZOO') return true;
    if (norm === 'commerce' && s.code === 'H-COM') return true;
    return nameLower === norm || nameLower.includes(norm) || norm.includes(nameLower);
  });

  // Find corresponding AEDP subject definition if any
  const aedpSub = ALL_SUBJECT_DEFINITIONS.find(s => {
    if (!s.isAedp) return false;
    const nameLower = s.name.toLowerCase();
    if (norm === 'english' && s.code === 'AEDP-ENG') return true;
    if (norm === 'history' && s.code === 'AEDP-HIST') return true;
    if (norm === 'economics' && s.code === 'AEDP-ECO') return true;
    if (norm === 'commerce' && s.code === 'AEDP-COM') return true;
    if (norm === 'botany' && s.code === 'AEDP-BOT') return true;
    if (norm === 'zoology' && s.code === 'AEDP-ZOO') return true;
    if (norm === 'mathematics' && s.code === 'AEDP-MATH') return true;
    if (norm === 'chemistry' && s.code === 'AEDP-CHEM') return true;
    return nameLower.includes(norm);
  });

  const regularSanctioned = regularSub ? (map[regularSub.code] ?? regularSub.baseStrength) : 0;
  const aedpSanctioned = aedpSub ? (map[aedpSub.code] ?? aedpSub.baseStrength) : 0;

  const regularStudents = students.filter(s => regularSub ? matchesSubjectDefinition(s.subject, regularSub) : false);
  const aedpStudents = students.filter(s => aedpSub ? matchesSubjectDefinition(s.subject, aedpSub) : false);

  const regularEnrolled = regularStudents.length;
  const aedpEnrolled = aedpStudents.length;

  const totalIntakeCapacity = regularSanctioned + aedpSanctioned;
  const totalEnrolled = regularEnrolled + aedpEnrolled;
  const totalVacancies = Math.max(0, totalIntakeCapacity - totalEnrolled);

  return {
    departmentName: deptNameOrSubject,
    regularCourseName: regularSub ? regularSub.name : 'Regular Honours',
    regularSanctioned,
    regularEnrolled,
    aedpCourseName: aedpSub ? aedpSub.name : undefined,
    aedpSanctioned,
    aedpEnrolled,
    totalIntakeCapacity,
    totalEnrolled,
    totalVacancies
  };
}

/**
 * Synchronizes the vacant seats count for a department / major subject directly from Subjects & Seat Matrix.
 */
export function getSubjectVacancyFromSeatMatrix(
  deptOrSubjectName: string,
  students: Student[] = [],
  sanctionedSeatsMap?: Record<string, number>
): {
  vacancy: number;
  sanctionedStrength: number;
  admittedCount: number;
  matchedCode?: string;
  matchedName?: string;
} {
  if (!deptOrSubjectName) {
    return { vacancy: 5, sanctionedStrength: 0, admittedCount: 0 };
  }

  const map = sanctionedSeatsMap || getSavedSanctionedSeats();
  const raw = deptOrSubjectName.trim();
  const norm = raw.toLowerCase().replace(/^(department of |dept of |dept\. of |honours in |h-)/i, '').trim();

  // 1. Check exact match with any of the 28 subject names or codes
  let directSub = ALL_SUBJECT_DEFINITIONS.find(s => 
    s.name.toLowerCase() === norm || 
    s.code.toLowerCase() === norm ||
    s.name.toLowerCase() === raw.toLowerCase() ||
    s.code.toLowerCase() === raw.toLowerCase()
  );

  // 2. If not direct, check using matchesSubjectDefinition
  if (!directSub) {
    directSub = ALL_SUBJECT_DEFINITIONS.find(s => matchesSubjectDefinition(raw, s));
  }

  // 3. If still not matched, check keyword match (e.g. "political science", "chemistry", "botany")
  if (!directSub) {
    directSub = ALL_SUBJECT_DEFINITIONS.find(s => {
      const sNameLower = s.name.toLowerCase();
      return (norm.length >= 3 && sNameLower.includes(norm)) || (sNameLower.length >= 3 && norm.includes(sNameLower));
    });
  }

  if (directSub) {
    const sanctioned = map[directSub.code] ?? directSub.baseStrength;
    const admitted = students.filter(s => matchesSubjectDefinition(s.subject, directSub!)).length;
    const vacancy = Math.max(0, sanctioned - admitted);

    return {
      vacancy,
      sanctionedStrength: sanctioned,
      admittedCount: admitted,
      matchedCode: directSub.code,
      matchedName: directSub.name
    };
  }

  // 4. If it's a general department name (e.g. Arts, Science), use getDepartmentIntakeSummary
  const summary = getDepartmentIntakeSummary(deptOrSubjectName, map, students);
  if (summary && summary.totalIntakeCapacity > 0) {
    return {
      vacancy: summary.totalVacancies,
      sanctionedStrength: summary.totalIntakeCapacity,
      admittedCount: summary.totalEnrolled,
      matchedName: summary.departmentName
    };
  }

  return {
    vacancy: 5,
    sanctionedStrength: 0,
    admittedCount: 0
  };
}
