import { db, doc, getDoc, setDoc } from '../firebase';

export interface HodAccount {
  id: string; // e.g. MATHEMATICS_HOD
  deptId: string; // e.g. dept-math
  subjectName: string; // e.g. Mathematics
  courseName: string; // e.g. B.Sc in Mathematics
  hodName: string; // e.g. Prof. R. N. Patel
  email: string;
  password: string; // random >= 6 chars
}

export const DEFAULT_HOD_ACCOUNTS: HodAccount[] = [
  {
    id: 'ODIA_HOD',
    deptId: 'dept-odia',
    subjectName: 'Odia',
    courseName: 'B.A in Odia',
    hodName: 'Dr. B. K. Sahu',
    email: 'hod.odia@samspanchayat.edu.in',
    password: 'ODIA#8412'
  },
  {
    id: 'ENGLISH_HOD',
    deptId: 'dept-eng',
    subjectName: 'English',
    courseName: 'B.A in English',
    hodName: 'Prof. S. Pradhan',
    email: 'hod.english@samspanchayat.edu.in',
    password: 'ENG#3915'
  },
  {
    id: 'POLITICAL_SCIENCE_HOD',
    deptId: 'dept-ps',
    subjectName: 'Political Science',
    courseName: 'B.A in Political Science',
    hodName: 'Dr. S. K. Meher',
    email: 'hod.ps@samspanchayat.edu.in',
    password: 'POLS#7204'
  },
  {
    id: 'HISTORY_HOD',
    deptId: 'dept-hist',
    subjectName: 'History',
    courseName: 'B.A in History',
    hodName: 'Dr. R. N. Panda',
    email: 'hod.history@samspanchayat.edu.in',
    password: 'HIST#5183'
  },
  {
    id: 'ECONOMICS_HOD',
    deptId: 'dept-eco',
    subjectName: 'Economics',
    courseName: 'B.A in Economics',
    hodName: 'Prof. P. K. Sahoo',
    email: 'hod.eco@samspanchayat.edu.in',
    password: 'ECON#2947'
  },
  {
    id: 'PHILOSOPHY_HOD',
    deptId: 'dept-phil',
    subjectName: 'Philosophy',
    courseName: 'B.A in Philosophy',
    hodName: 'Dr. Anita Dash',
    email: 'hod.phil@samspanchayat.edu.in',
    password: 'PHIL#6308'
  },
  {
    id: 'SANSKRIT_HOD',
    deptId: 'dept-sans',
    subjectName: 'Sanskrit',
    courseName: 'B.A in Sanskrit',
    hodName: 'Dr. B. Mishra',
    email: 'hod.sanskrit@samspanchayat.edu.in',
    password: 'SANS#4172'
  },
  {
    id: 'HINDI_HOD',
    deptId: 'dept-hindi',
    subjectName: 'Hindi',
    courseName: 'B.A in Hindi',
    hodName: 'Prof. M. Devi',
    email: 'hod.hindi@samspanchayat.edu.in',
    password: 'HNDI#9531'
  },
  {
    id: 'EDUCATION_HOD',
    deptId: 'dept-educ',
    subjectName: 'Education',
    courseName: 'B.A in Education',
    hodName: 'Dr. K. N. Jena',
    email: 'hod.edu@samspanchayat.edu.in',
    password: 'EDUC#1864'
  },
  {
    id: 'SOCIOLOGY_HOD',
    deptId: 'dept-socio',
    subjectName: 'Sociology',
    courseName: 'B.A in Sociology',
    hodName: 'Prof. R. Behera',
    email: 'hod.socio@samspanchayat.edu.in',
    password: 'SOCI#7420'
  },
  {
    id: 'GEOGRAPHY_HOD',
    deptId: 'dept-geog',
    subjectName: 'Geography',
    courseName: 'B.A in Geography',
    hodName: 'Dr. P. Sahu',
    email: 'hod.geog@samspanchayat.edu.in',
    password: 'GEOG#3059'
  },
  {
    id: 'PSYCHOLOGY_HOD',
    deptId: 'dept-psych',
    subjectName: 'Psychology',
    courseName: 'B.A in Psychology',
    hodName: 'Dr. S. Mohapatra',
    email: 'hod.psych@samspanchayat.edu.in',
    password: 'PSYC#8614'
  },
  {
    id: 'PHYSICS_HOD',
    deptId: 'dept-physics',
    subjectName: 'Physics',
    courseName: 'B.Sc in Physics',
    hodName: 'Dr. M. R. Mishra',
    email: 'hod.physics@samspanchayat.edu.in',
    password: 'PHYS#9241'
  },
  {
    id: 'CHEMISTRY_HOD',
    deptId: 'dept-chem',
    subjectName: 'Chemistry',
    courseName: 'B.Sc in Chemistry',
    hodName: 'Dr. Anita Dash',
    email: 'hod.chem@samspanchayat.edu.in',
    password: 'CHEM#6152'
  },
  {
    id: 'MATHEMATICS_HOD',
    deptId: 'dept-math',
    subjectName: 'Mathematics',
    courseName: 'B.Sc in Mathematics',
    hodName: 'Prof. R. N. Patel',
    email: 'hod.math@samspanchayat.edu.in',
    password: 'MATH#7390'
  },
  {
    id: 'BOTANY_HOD',
    deptId: 'dept-bot',
    subjectName: 'Botany',
    courseName: 'B.Sc in Botany',
    hodName: 'Dr. S. K. Pradhan',
    email: 'hod.botany@samspanchayat.edu.in',
    password: 'BOTN#2841'
  },
  {
    id: 'ZOOLOGY_HOD',
    deptId: 'dept-zoo',
    subjectName: 'Zoology',
    courseName: 'B.Sc in Zoology',
    hodName: 'Dr. L. N. Patel',
    email: 'hod.zoology@samspanchayat.edu.in',
    password: 'ZOOL#5937'
  },
  {
    id: 'STATISTICS_HOD',
    deptId: 'dept-stat',
    subjectName: 'Statistics',
    courseName: 'B.Sc in Statistics',
    hodName: 'Prof. B. Dash',
    email: 'hod.stat@samspanchayat.edu.in',
    password: 'STAT#4028'
  },
  {
    id: 'COMPUTER_SCIENCE_HOD',
    deptId: 'dept-cs',
    subjectName: 'Computer Science',
    courseName: 'B.Sc in Computer Science (Self Financing)',
    hodName: 'Prof. A. K. Rout',
    email: 'hod.cs@samspanchayat.edu.in',
    password: 'COMP#8163'
  },
  {
    id: 'COMMERCE_HOD',
    deptId: 'dept-comm',
    subjectName: 'Commerce',
    courseName: 'B.Com in Commerce',
    hodName: 'Dr. P. K. Jena',
    email: 'hod.comm@samspanchayat.edu.in',
    password: 'COMM#3750'
  }
];

const LOCAL_STORAGE_KEY = 'SAMS_HOD_CREDENTIALS_ACCOUNTS';

export async function getHodCredentials(): Promise<HodAccount[]> {
  try {
    const docRef = doc(db, 'systemSettings', 'hodCredentials');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.accounts) && data.accounts.length > 0) {
        // Merge with defaults in case new departments were added
        const remoteAccounts: HodAccount[] = data.accounts;
        const mergedMap = new Map<string, HodAccount>();
        DEFAULT_HOD_ACCOUNTS.forEach(a => mergedMap.set(a.id, a));
        remoteAccounts.forEach(a => mergedMap.set(a.id, { ...mergedMap.get(a.id), ...a }));
        const merged = Array.from(mergedMap.values());
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    }
  } catch (e) {
    console.warn('Could not load HOD credentials from Firestore, trying localStorage:', e);
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read cached HOD credentials:', e);
  }

  return DEFAULT_HOD_ACCOUNTS;
}

export async function saveHodCredentials(accounts: HodAccount[]): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Failed to save HOD credentials to localStorage:', e);
  }

  try {
    const docRef = doc(db, 'systemSettings', 'hodCredentials');
    await setDoc(docRef, { accounts, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.warn('Failed to sync HOD credentials to Firestore:', e);
  }
}

export async function updateHodPassword(hodId: string, newPass: string): Promise<HodAccount[]> {
  const current = await getHodCredentials();
  const updated = current.map(acc => acc.id === hodId ? { ...acc, password: newPass } : acc);
  await saveHodCredentials(updated);
  return updated;
}

export function generateRandomPassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789#@!';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export async function authenticateHod(loginIdInput: string, passwordInput: string): Promise<HodAccount | null> {
  const cleanId = loginIdInput.trim().toUpperCase();
  const accounts = await getHodCredentials();
  const found = accounts.find(a => a.id.toUpperCase() === cleanId && a.password === passwordInput.trim());
  return found || null;
}
