import * as XLSX from 'xlsx';
import { db, doc, getDoc, setDoc } from '../firebase';

export interface SpotWaitingStudent {
  id: string;
  barcode: string; // Barcode or Application No (Primary ID)
  rollNumber?: string;
  name: string;
  fatherName?: string;
  gender?: 'Female' | 'Male' | string;
  category: 'GEN' | 'SC' | 'ST' | 'SEBC' | 'OBC' | string;
  departmentName: string; // Target department / subject applied for
  stream?: string;
  percentage?: number; // Career % or +2 mark
  mark?: number; // Total mark scored
  rank?: number; // Merit rank
  waitingRank?: number | string; // Waiting list rank
  maxMark?: number; // Maximum mark / full marks
  securedMark?: number; // Secure mark / obtained mark
  phone?: string;
  email?: string;
  reported: boolean; // true = Reported, false = Not Reported
  reportedAt?: string;
  sourceFile?: string; // name of excel sheet
  uploadedAt: string;
}

export interface DepartmentSpotResult {
  deptId?: string;
  deptName: string;
  vacancy: number;
  reportedCount: number;
  selectedStudents: Array<SpotWaitingStudent & { selectionRank: number }>;
  waitingStudents: Array<SpotWaitingStudent & { waitingRank: number }>;
}

export interface SpotPublishedResult {
  publishedAt: string;
  publishedBy: string;
  totalReported: number;
  totalSelected: number;
  totalWaiting: number;
  departments: DepartmentSpotResult[];
}

const STORAGE_KEY_WAITING_STUDENTS = 'SAMS_SPOT_WAITING_STUDENTS';
const STORAGE_KEY_PUBLISHED_RESULTS = 'SAMS_SPOT_PUBLISHED_RESULTS';
const STORAGE_KEY_CUSTOM_VACANCIES = 'SAMS_SPOT_CUSTOM_VACANCIES';
const STORAGE_KEY_SPOT_ENABLED = 'SAMS_SPOT_ROUND_ENABLED';

/**
 * Get spot round public enabled status from localStorage
 */
export function getLocalSpotRoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SPOT_ENABLED);
    if (raw === null) return true;
    return JSON.parse(raw);
  } catch (err) {
    return true;
  }
}

/**
 * Fetch spot round public enabled status from Firestore or fallback to localStorage
 */
export async function fetchSpotRoundEnabled(): Promise<boolean> {
  const localVal = getLocalSpotRoundEnabled();
  try {
    const snap = await getDoc(doc(db, 'systemSettings', 'spotRoundConfig'));
    if (snap.exists()) {
      const data = snap.data();
      if (typeof data.enabled === 'boolean') {
        localStorage.setItem(STORAGE_KEY_SPOT_ENABLED, JSON.stringify(data.enabled));
        return data.enabled;
      }
    }
  } catch (err) {
    // Quota or network fallback
  }
  return localVal;
}

/**
 * Save spot round enabled status
 */
export async function saveSpotRoundEnabled(enabled: boolean): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY_SPOT_ENABLED, JSON.stringify(enabled));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('sams_spot_round_channel');
        channel.postMessage({ type: 'SPOT_ROUND_TOGGLED', enabled });
        channel.close();
      } catch (_) {}
    }
    await setDoc(doc(db, 'systemSettings', 'spotRoundConfig'), { enabled }, { merge: true });
  } catch (err) {
    // Graceful fallback
  }
}

/**
 * Get all saved spot round waiting list students from localStorage
 */
export function getSpotWaitingStudents(): SpotWaitingStudent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WAITING_STUDENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load spot waiting students from localStorage:', err);
    return [];
  }
}

/**
 * Save spot round waiting list students to localStorage, BroadcastChannel, and Firestore
 */
export async function saveSpotWaitingStudents(students: SpotWaitingStudent[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY_WAITING_STUDENTS, JSON.stringify(students));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('sams_spot_round_channel');
        channel.postMessage({ type: 'SPOT_WAITING_STUDENTS_UPDATED', list: students });
        channel.close();
      } catch (_) {}
    }
    await setDoc(doc(db, 'systemSettings', 'spotWaitingStudents'), {
      list: students,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Spot waiting students save error:', err);
  }
}

/**
 * Get published spot results from localStorage
 */
export function getSpotPublishedResult(): SpotPublishedResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PUBLISHED_RESULTS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load published spot result from localStorage:', err);
    return null;
  }
}

/**
 * Save published spot results to localStorage, BroadcastChannel, and Firestore
 */
export async function saveSpotPublishedResult(result: SpotPublishedResult | null): Promise<void> {
  try {
    if (result === null) {
      localStorage.removeItem(STORAGE_KEY_PUBLISHED_RESULTS);
    } else {
      localStorage.setItem(STORAGE_KEY_PUBLISHED_RESULTS, JSON.stringify(result));
    }
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('sams_spot_round_channel');
        channel.postMessage({ type: 'SPOT_PUBLISHED_RESULT_UPDATED', result });
        channel.close();
      } catch (_) {}
    }
    await setDoc(doc(db, 'systemSettings', 'spotPublishedResult'), {
      result,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Published spot result save error:', err);
  }
}

/**
 * Get custom vacancy overrides for departments (if admin customizes them)
 */
export function getSpotCustomVacancies(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_VACANCIES);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

/**
 * Save custom vacancy overrides to localStorage, BroadcastChannel, and Firestore
 */
export async function saveSpotCustomVacancies(vacancies: Record<string, number>): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_VACANCIES, JSON.stringify(vacancies));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('sams_spot_round_channel');
        channel.postMessage({ type: 'SPOT_CUSTOM_VACANCIES_UPDATED', vacancies });
        channel.close();
      } catch (_) {}
    }
    await setDoc(doc(db, 'systemSettings', 'spotCustomVacancies'), {
      vacancies,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Custom vacancies save error:', err);
  }
}

// Normalize cell text
function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    if (val > 1000000000) {
      return val.toLocaleString('fullwide', { useGrouping: false });
    }
    return String(val);
  }
  return String(val).trim().replace(/^["']|["']$/g, '');
}

/**
 * Validates if a string key is a genuine unique identifier 
 * (not a placeholder like '—', 'N/A', '0', 'Nil', 'Null', etc.)
 */
function isValidKey(val: string | undefined | null): boolean {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  if (clean.length < 2) return false;
  const invalidValues = [
    '—', '-', '–', '---', '--', 'n/a', 'na', 'null', 'undefined', 'nil', 
    'none', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'unknown', 
    'not applicable', 'not available', 'no', 'empty', 'blank', 'pending', 
    'na/na', 'none/none', 'n.a.', 'n.a', 'no.', 'nil/nil', '—/—', 'null/null'
  ];
  if (invalidValues.includes(clean)) return false;
  if (clean.startsWith('spot-') || clean.startsWith('temp-')) return false;
  return true;
}

/**
 * Parse an uploaded Excel / CSV workbook into SpotWaitingStudent records
 */
export function parseSpotExcelWorkbook(
  workbook: XLSX.WorkBook, 
  fileName: string,
  existingList: SpotWaitingStudent[] = []
): { 
  students: SpotWaitingStudent[]; 
  newCount: number; 
  updatedCount: number; 
  sheetNames: string[];
} {
  const resultStudents: SpotWaitingStudent[] = [...existingList];
  
  let newCount = 0;
  let updatedCount = 0;
  const processedSheetNames: string[] = [];

  for (let sIdx = 0; sIdx < workbook.SheetNames.length; sIdx++) {
    const sheetName = workbook.SheetNames[sIdx];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    processedSheetNames.push(sheetName);

    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
    const formattedRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (!rawRows || rawRows.length === 0) continue;

    // Detect header row up to 100 rows deep
    let headerRowIdx = -1;
    let colMap: Record<string, number> = {};
    let maxHits = 0;

    for (let r = 0; r < Math.min(100, rawRows.length); r++) {
      const row = formattedRows[r] || rawRows[r];
      if (!Array.isArray(row)) continue;

      const tempMap: Record<string, number> = {};
      let hits = 0;

      for (let c = 0; c < row.length; c++) {
        const text = cleanStr(row[c]).toLowerCase();
        if (!text) continue;

        if (
          text.includes('barcode') || text.includes('bar code') || 
          text.includes('caf') || text.includes('app no') || text.includes('app. no') || text.includes('appno') ||
          text.includes('application') || text.includes('applicant id') || text.includes('applicant no') ||
          text.includes('reg') || text.includes('registration') || text.includes('form no') || text.includes('challan')
        ) {
          tempMap.barcode = c;
          hits += 3;
        } else if (text.includes('roll') && !text.includes('univ')) {
          tempMap.rollNumber = c;
          hits += 3;
        } else if (
          (text.includes('name') || text.includes('candidate') || text.includes('applicant') || text.includes('student') || text.includes('person')) &&
          !text.includes('father') && !text.includes('mother') && !text.includes('college') && !text.includes('dept') && !text.includes('subject') && !text.includes('stream')
        ) {
          tempMap.name = c;
          hits += 4;
        } else if (text.includes('father') || text.includes('parent') || text.includes('guardian') || text.includes('mother')) {
          tempMap.fatherName = c;
          hits += 2;
        } else if (
          text === 'major subject' || text === 'major subjects' || text === 'major' ||
          text.includes('major subject') || text.includes('major subjects') ||
          text.includes('major_subject') || text.includes('majorsubject') || text.includes('major-subject')
        ) {
          tempMap.majorSubject = c;
          hits += 5;
        } else if (
          text.includes('honours subject') || text.includes('hons subject') || text === 'honours' || text === 'hons'
        ) {
          tempMap.honoursSubject = c;
          hits += 4;
        } else if (
          (text.includes('dept') || text.includes('department') || text.includes('subject') || text.includes('course') || text.includes('trade') || text.includes('discipline') || text.includes('stream')) &&
          !text.includes('parent') && !text.includes('father') && !text.includes('mother') && !text.includes('compulsory')
        ) {
          if (tempMap.department === undefined) {
            tempMap.department = c;
          }
          hits += 3;
        } else if (
          text.includes('max') || text.includes('total mark') || text.includes('full mark') || text === 'm.m.' || text === 'f.m.' || text.includes('out of')
        ) {
          tempMap.maxMark = c;
          hits += 4;
        } else if (
          text.includes('secur') || text.includes('obtain') || text.includes('m.o.') || text === 'sec mark' || text === 'sec marks' || text.includes('mark secured') || text.includes('marks secured')
        ) {
          tempMap.securedMark = c;
          hits += 4;
        } else if (text.includes('percent') || text.includes('%') || text.includes('pct') || text.includes('career') || text.includes('aggregate')) {
          tempMap.percentage = c;
          hits += 4;
        } else if (
          text === 'waiting rank' || text === 'wl rank' || text.includes('waiting rank') || text.includes('waiting no') || text.includes('wl no') || text.includes('wait rank') || text.includes('merit rank')
        ) {
          tempMap.waitingRank = c;
          tempMap.rank = c;
          hits += 5;
        } else if (text.includes('rank') || text.includes('merit') || text === 'sl no' || text === 's.no' || text.includes('position') || text.includes('serial')) {
          if (tempMap.waitingRank === undefined) {
            tempMap.rank = c;
          }
          hits += 2;
        } else if (text.includes('mark') || text.includes('score')) {
          if (tempMap.securedMark === undefined) {
            tempMap.mark = c;
          }
          hits += 2;
        } else if (text.includes('caste') || text.includes('category') || text.includes('quota') || text.includes('social') || text.includes('cat')) {
          tempMap.category = c;
          hits += 2;
        } else if (text.includes('gender') || text.includes('sex')) {
          tempMap.gender = c;
          hits += 2;
        } else if (text.includes('phone') || text.includes('mobile') || text.includes('contact') || text.includes('cell') || text.includes('tel')) {
          tempMap.phone = c;
          hits += 2;
        } else if (text.includes('email') || text.includes('mail')) {
          tempMap.email = c;
          hits += 2;
        }
      }

      if (hits >= 1 && hits > maxHits) {
        maxHits = hits;
        headerRowIdx = r;
        colMap = tempMap;
      }
    }

    // Default column fallback if header detection was sparse
    if (headerRowIdx === -1) {
      headerRowIdx = -1; // Process from row 0
      let inferredName = 1;
      let inferredBarcode = 0;
      let inferredDept = 2;
      let inferredMark = 3;
      let inferredCat = 4;

      for (let r = 0; r < Math.min(20, rawRows.length); r++) {
        const row = formattedRows[r] || rawRows[r];
        if (!Array.isArray(row)) continue;
        for (let c = 0; c < row.length; c++) {
          const val = cleanStr(row[c]);
          if (/^[a-z0-9]{2,15}$/i.test(val) && (val.toLowerCase().startsWith('caf') || val.length >= 8)) {
            inferredBarcode = c;
          } else if (/^[a-z\s\.\']{3,40}$/i.test(val) && !['gen','sc','st','sebc','obc'].includes(val.toLowerCase())) {
            if (c !== inferredBarcode) inferredName = c;
          }
        }
      }

      colMap = {
        name: inferredName,
        barcode: inferredBarcode,
        department: inferredDept,
        mark: inferredMark,
        category: inferredCat
      };
    }

    let activeDeptHeader = '';

    // Extract student rows from headerRowIdx + 1 onwards
    const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
    for (let r = startRow; r < rawRows.length; r++) {
      const row = rawRows[r];
      const formRow = formattedRows[r] || row;
      if (!Array.isArray(row) || row.length === 0) continue;

      // Check if row has any non-empty cell
      const filledCells = row.map(cell => cleanStr(cell)).filter(val => val.length > 0);
      if (filledCells.length === 0) continue;

      // Detect section header rows (e.g. single cell title like "DEPARTMENT OF BOTANY")
      if (filledCells.length === 1) {
        const titleText = filledCells[0];
        if (titleText.length > 3 && !titleText.toLowerCase().includes('page') && !titleText.toLowerCase().includes('total')) {
          activeDeptHeader = titleText.replace(/department of|dept of|subject/gi, '').trim();
          continue;
        }
      }

      const rawName = colMap.name !== undefined ? cleanStr(formRow[colMap.name] || row[colMap.name]) : '';
      const rawBarcode = colMap.barcode !== undefined ? cleanStr(formRow[colMap.barcode] || row[colMap.barcode]) : '';
      const rawRoll = colMap.rollNumber !== undefined ? cleanStr(formRow[colMap.rollNumber] || row[colMap.rollNumber]) : '';
      
      // Sync department names directly as given in 'major subjects' or active section header
      let rawDept = '';
      if (colMap.majorSubject !== undefined) {
        rawDept = cleanStr(formRow[colMap.majorSubject] || row[colMap.majorSubject]);
      } else if (colMap.honoursSubject !== undefined) {
        rawDept = cleanStr(formRow[colMap.honoursSubject] || row[colMap.honoursSubject]);
      } else if (colMap.department !== undefined) {
        rawDept = cleanStr(formRow[colMap.department] || row[colMap.department]);
      }
      if (!rawDept && activeDeptHeader) {
        rawDept = activeDeptHeader;
      }

      // Skip repeated header rows
      const nameLower = rawName.toLowerCase();
      const barcodeLower = rawBarcode.toLowerCase();
      if (
        nameLower === 'name' || nameLower === 'applicant name' || nameLower === 'candidate name' || nameLower === 'student name' ||
        barcodeLower.includes('barcode') || barcodeLower.includes('application') || barcodeLower === 'caf no'
      ) {
        continue;
      }

      // Clean name
      const name = rawName.replace(/^\d+[\.\-\s)]+/, '').trim() || `Applicant ${r + 1}`;

      // Clean barcode or generate stable fallback unique ID
      const barcode = isValidKey(rawBarcode) 
        ? rawBarcode 
        : (isValidKey(rawRoll) ? rawRoll : `SPOT-S${sIdx + 1}-R${r + 1}-${Math.random().toString(36).substring(2, 6)}`);

      // Department name is preserved directly from Major Subjects or sheet name
      const deptName = rawDept.trim() || sheetName || 'General';

      // Clean category
      let category = colMap.category !== undefined ? cleanStr(formRow[colMap.category] || row[colMap.category]).toUpperCase() : 'GEN';
      if (!category || category === 'GENERAL') category = 'GEN';

      // Clean rank & waiting rank
      let rank: number | undefined;
      let waitingRank: number | string | undefined;

      const rawWaitingRank = colMap.waitingRank !== undefined ? cleanStr(formRow[colMap.waitingRank] || row[colMap.waitingRank]) : '';
      if (rawWaitingRank) {
        const num = parseInt(rawWaitingRank.replace(/\D/g, ''), 10);
        waitingRank = !isNaN(num) ? num : rawWaitingRank;
        rank = !isNaN(num) ? num : undefined;
      }

      if (rank === undefined && colMap.rank !== undefined) {
        const rankNum = parseInt(cleanStr(formRow[colMap.rank] || row[colMap.rank]).replace(/\D/g, ''), 10);
        if (!isNaN(rankNum) && rankNum > 0) {
          rank = rankNum;
          if (waitingRank === undefined) waitingRank = rankNum;
        }
      }

      if (waitingRank === undefined) {
        waitingRank = r - Math.max(0, headerRowIdx);
        rank = r - Math.max(0, headerRowIdx);
      }

      // Maximum mark
      let maxMark: number | undefined;
      if (colMap.maxMark !== undefined) {
        const parsed = parseFloat(cleanStr(row[colMap.maxMark] || formRow[colMap.maxMark]));
        if (!isNaN(parsed) && parsed > 0) maxMark = parsed;
      }

      // Secure mark
      let securedMark: number | undefined;
      if (colMap.securedMark !== undefined) {
        const parsed = parseFloat(cleanStr(row[colMap.securedMark] || formRow[colMap.securedMark]));
        if (!isNaN(parsed)) securedMark = parsed;
      }

      // Percentage
      let percentage: number | undefined;
      if (colMap.percentage !== undefined) {
        const markStr = cleanStr(formRow[colMap.percentage] || row[colMap.percentage]).replace(/%/g, '');
        const parsed = parseFloat(markStr);
        if (!isNaN(parsed)) {
          if (parsed <= 1.0 && parsed > 0) {
            percentage = parseFloat((parsed * 100).toFixed(2));
          } else {
            percentage = parsed;
          }
        }
      }

      // Fallback mark detection
      let mark: number | undefined = securedMark;
      if (colMap.mark !== undefined && mark === undefined) {
        const markStr = cleanStr(formRow[colMap.mark] || row[colMap.mark]).replace(/%/g, '');
        const parsedNum = parseFloat(markStr);
        if (!isNaN(parsedNum)) {
          mark = parsedNum;
          if (securedMark === undefined) securedMark = parsedNum;
          if (percentage === undefined) {
            if (parsedNum <= 100) {
              percentage = parsedNum;
            } else {
              percentage = parseFloat(((parsedNum / (maxMark || 600)) * 100).toFixed(2));
            }
          }
        }
      }

      // If percentage is still not derived, calculate from securedMark / maxMark
      if (percentage === undefined && securedMark !== undefined && maxMark !== undefined && maxMark > 0) {
        percentage = parseFloat(((securedMark / maxMark) * 100).toFixed(2));
      }

      // If securedMark exists but maxMark is missing, infer standard maximum
      if (securedMark !== undefined && maxMark === undefined) {
        if (percentage !== undefined && percentage > 0) {
          maxMark = Math.round((securedMark / percentage) * 100);
        } else if (securedMark <= 100) {
          maxMark = 100;
        } else {
          maxMark = 600;
        }
      }

      const gender = colMap.gender !== undefined ? cleanStr(formRow[colMap.gender] || row[colMap.gender]) : undefined;
      const fatherName = colMap.fatherName !== undefined ? cleanStr(formRow[colMap.fatherName] || row[colMap.fatherName]) : undefined;
      const phone = colMap.phone !== undefined ? cleanStr(formRow[colMap.phone] || row[colMap.phone]) : undefined;
      const email = colMap.email !== undefined ? cleanStr(formRow[colMap.email] || row[colMap.email]) : undefined;
      const stream = colMap.stream !== undefined ? cleanStr(formRow[colMap.stream] || row[colMap.stream]) : undefined;

      // Create a direct student entry for every row (no uniqueness/barcode check or deduplication)
      const newStudent: SpotWaitingStudent = {
        id: `spot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${sIdx}_${r}`,
        barcode: rawBarcode || rawRoll || `SPOT-S${sIdx + 1}-R${r + 1}-${Math.random().toString(36).substring(2, 6)}`,
        rollNumber: rawRoll || undefined,
        name,
        fatherName,
        gender,
        category,
        departmentName: deptName,
        stream,
        percentage: percentage !== undefined ? percentage : undefined,
        mark: securedMark !== undefined ? securedMark : (mark !== undefined ? mark : undefined),
        rank: rank || (resultStudents.length + 1),
        waitingRank: waitingRank || (resultStudents.length + 1),
        maxMark,
        securedMark,
        phone,
        email,
        reported: false, // Default: Not Reported
        sourceFile: fileName,
        uploadedAt: new Date().toISOString()
      };

      resultStudents.push(newStudent);
      newCount++;
    }
  }

  return {
    students: resultStudents,
    newCount,
    updatedCount,
    sheetNames: processedSheetNames
  };
}

/**
 * Compute the Provisional Selection and Waiting List based on vacancy
 */
export function computeSelectionResults(
  waitingStudents: SpotWaitingStudent[],
  vacanciesByDept: Record<string, number>,
  publishedBy: string = 'Admin'
): SpotPublishedResult {
  // Group students by department
  const deptGroups = new Map<string, SpotWaitingStudent[]>();

  waitingStudents.forEach(s => {
    const dept = (s.departmentName || 'General').trim();
    if (!deptGroups.has(dept)) {
      deptGroups.set(dept, []);
    }
    deptGroups.get(dept)!.push(s);
  });

  const departmentResults: DepartmentSpotResult[] = [];
  let grandTotalReported = 0;
  let grandTotalSelected = 0;
  let grandTotalWaiting = 0;

  deptGroups.forEach((students, deptName) => {
    // Only reported students are eligible for spot provisional selection & waiting list
    const reportedStudents = students.filter(s => s.reported);
    grandTotalReported += reportedStudents.length;

    // Merit sort: highest percentage or highest mark, then rank ascending, then name
    const sortedReported = [...reportedStudents].sort((a, b) => {
      const aScore = a.percentage ?? a.mark ?? 0;
      const bScore = b.percentage ?? b.mark ?? 0;
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      if (a.rank && b.rank && a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // Vacancy count for this department (default 5 if not specified)
    const vacancy = Math.max(0, vacanciesByDept[deptName] ?? 5);

    // Top students up to vacancy are Provisionally Selected
    const selectedList = sortedReported.slice(0, vacancy).map((s, idx) => ({
      ...s,
      selectionRank: idx + 1
    }));

    // Rest are in Waiting List
    const waitingList = sortedReported.slice(vacancy).map((s, idx) => ({
      ...s,
      waitingRank: idx + 1
    }));

    grandTotalSelected += selectedList.length;
    grandTotalWaiting += waitingList.length;

    departmentResults.push({
      deptName,
      vacancy,
      reportedCount: reportedStudents.length,
      selectedStudents: selectedList,
      waitingStudents: waitingList
    });
  });

  // Sort departments alphabetically
  departmentResults.sort((a, b) => a.deptName.localeCompare(b.deptName));

  return {
    publishedAt: new Date().toISOString(),
    publishedBy,
    totalReported: grandTotalReported,
    totalSelected: grandTotalSelected,
    totalWaiting: grandTotalWaiting,
    departments: departmentResults
  };
}
