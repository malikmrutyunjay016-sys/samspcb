import React, { useState, useEffect } from 'react';
import { 
  db, 
  auth, 
  onAuthStateChanged, 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  writeBatch,
  query,
  onSnapshot
} from './firebase';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { SpotRoundView } from './components/SpotRoundView';
import { AdmissionApplyView } from './components/AdmissionApplyView';
import { StudentDatabaseView } from './components/StudentDatabaseView';
import { FacultyView } from './components/FacultyView';
import { HodPortalView } from './components/HodPortalView';
import { AuditLogView } from './components/AuditLogView';
import { LoginModal } from './components/LoginModal';
import { SeatMatrixView } from './components/SeatMatrixView';
import { SamsStatisticsView } from './components/SamsStatisticsView';
import { DownloadView } from './components/DownloadView';
import { ContactUsView } from './components/ContactUsView';
import { GoogleDriveBackupModal } from './components/GoogleDriveBackupModal';
import { SystemBackupPayload } from './utils/googleDriveBackupService';
import { createAndSyncSamsMasterData } from './utils/googleSheetsService';
import { getSyncSettings, getLocalSyncSettings, saveActiveStudentsCache, getActiveStudentsCache } from './utils/syncSettingsService';
import { getLocalSpotRoundEnabled, fetchSpotRoundEnabled, saveSpotRoundEnabled } from './utils/spotRoundService';
import { getSavedSanctionedSeats, getDefaultSanctionedSeats, getSanctionedSeatsMeta } from './utils/sanctionedSeatsService';
import { getHodCredentials, DEFAULT_HOD_ACCOUNTS } from './utils/hodAuthService';
import { 
  INITIAL_DEPARTMENTS, 
  INITIAL_NOTICES, 
  INITIAL_FACULTY, 
  INITIAL_STUDENTS, 
  INITIAL_APPLICATIONS 
} from './initialData';
import { SAMS_MASTER_STUDENTS } from './data/samsStudentMaster';
import { Department, Application, Student, Faculty, AuditLog, Notice } from './types';
import { HodAccount } from './utils/hodAuthService';
import { SanctionedSeatsMeta } from './utils/sanctionedSeatsService';
import { isQuotaError, markQuotaExhausted, isFirestoreQuotaExhausted, clearQuotaExhausted } from './utils/quotaManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isQuotaLimited, setIsQuotaLimited] = useState<boolean>(() => isFirestoreQuotaExhausted());
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [applications, setApplications] = useState<Application[]>(INITIAL_APPLICATIONS);
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const activeCache = localStorage.getItem('SAMS_ACTIVE_STUDENTS_CACHE');
      const fileCache = localStorage.getItem('SAMS_SAVED_FILE_STUDENTS');
      const urlCache = localStorage.getItem('SAMS_SAVED_URL_STUDENTS');

      let parsedActive: Student[] = activeCache ? JSON.parse(activeCache) : [];
      let parsedFile: Student[] = fileCache ? JSON.parse(fileCache) : [];
      let parsedUrl: Student[] = urlCache ? JSON.parse(urlCache) : [];

      // Always pick the largest cached student dataset so uploaded Excel data is never lost
      let maxList = parsedActive;
      if (parsedFile.length > maxList.length) maxList = parsedFile;
      if (parsedUrl.length > maxList.length) maxList = parsedUrl;

      if (maxList.length > 0) {
        return maxList;
      }
    } catch (e) {
      console.warn('Could not read cached students:', e);
    }
    return SAMS_MASTER_STUDENTS;
  });
  const [faculty, setFaculty] = useState<Faculty[]>(INITIAL_FACULTY);
  const [notices, setNotices] = useState<Notice[]>(INITIAL_NOTICES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'log-1',
      userId: 'admin_03071302',
      userName: 'Mrutyunjay Malik (Super Admin)',
      action: 'SYSTEM_BOOT',
      details: 'Initialized SAMS Panchayat College Baragada portal and loaded initial state.',
      timestamp: new Date().toLocaleString()
    }
  ]);

  const [sanctionedSeatsMap, setSanctionedSeatsMap] = useState<Record<string, number>>(() => getSavedSanctionedSeats());
  const [defaultSeatsMap, setDefaultSeatsMap] = useState<Record<string, number>>(() => getDefaultSanctionedSeats());
  const [seatsMeta, setSeatsMeta] = useState<SanctionedSeatsMeta>(() => getSanctionedSeatsMeta());
  const [hodAccounts, setHodAccounts] = useState<HodAccount[]>(() => {
    try {
      const cached = localStorage.getItem('SAMS_HOD_CREDENTIALS_ACCOUNTS');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_HOD_ACCOUNTS;
  });

  const [userRole, setUserRole] = useState<'admin' | 'hod' | 'student' | null>(() => {
    // Check localStorage for persisted session or default to public visitor (null)
    const saved = localStorage.getItem('SAMS_PORTAL_USER_ROLE');
    return (saved === 'admin' || saved === 'hod' || saved === 'student') ? saved : null;
  });
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; deptId?: string } | null>(() => {
    try {
      const savedInfo = localStorage.getItem('SAMS_PORTAL_USER_INFO');
      return savedInfo ? JSON.parse(savedInfo) : null;
    } catch {
      return null;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSpotRoundEnabled, setIsSpotRoundEnabled] = useState<boolean>(getLocalSpotRoundEnabled);
  const [studentIdTabEnabled, setStudentIdTabEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('SAMS_PORTAL_STUDENT_ID_ENABLED');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [studentDirectoryEnabled, setStudentDirectoryEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('SAMS_PORTAL_STUDENT_DIRECTORY_ENABLED');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [subjectCounsellingTabEnabled, setSubjectCounsellingTabEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('SAMS_PORTAL_SUBJECT_COUNSELLING_ENABLED');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [prospectusUrl, setProspectusUrl] = useState<string>(() => {
    return localStorage.getItem('sams_common_prospectus_url') || 'https://samsodisha.gov.in/';
  });
  const [collegeLogoUrl, setCollegeLogoUrl] = useState<string>(() => {
    return localStorage.getItem('sams_college_logo_url') || '';
  });
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Sync spot round config in real-time from Firestore, BroadcastChannel, and localStorage storage events
  useEffect(() => {
    fetchSpotRoundEnabled().then((enabled: boolean) => {
      setIsSpotRoundEnabled(enabled);
    });

    // Listen for local storage changes across browser tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'SAMS_SPOT_ROUND_ENABLED' && e.newValue !== null) {
        try {
          setIsSpotRoundEnabled(JSON.parse(e.newValue));
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // Listen for BroadcastChannel messages across tabs
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('sams_spot_round_channel');
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'SPOT_ROUND_TOGGLED' && typeof event.data.enabled === 'boolean') {
            setIsSpotRoundEnabled(event.data.enabled);
          }
        };
      } catch (_) {}
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
    };
  }, []);

  // Redirect if spot round is disabled and user is not admin
  useEffect(() => {
    if (!isSpotRoundEnabled && userRole !== 'admin' && activeTab === 'spot-round') {
      setActiveTab('home');
    }
  }, [isSpotRoundEnabled, userRole, activeTab]);

  const handleToggleSpotRound = async (enabled: boolean) => {
    setIsSpotRoundEnabled(enabled);
    await saveSpotRoundEnabled(enabled);
    addAuditLog(
      userInfo?.name || 'Admin',
      'TOGGLE_SPOT_ROUND',
      `Admin ${enabled ? 'ENABLED' : 'DISABLED'} Spot Round Seats portal access for HOD/Public.`
    );
  };

  const handleToggleStudentIdTab = async (enabled: boolean) => {
    setStudentIdTabEnabled(enabled);
    localStorage.setItem('SAMS_PORTAL_STUDENT_ID_ENABLED', JSON.stringify(enabled));
    try {
      await setDoc(doc(db, 'systemSettings', 'uiConfig'), { studentIdEnabled: enabled }, { merge: true });
    } catch (e) {
      console.warn('Failed to sync student ID tab status:', e);
    }
    addAuditLog(userInfo?.name || 'Admin', 'TOGGLE_STUDENT_ID_TAB', `Admin ${enabled ? 'ENABLED' : 'DISABLED'} Student ID tab.`);
  };

  const handleToggleStudentDirectory = async (enabled: boolean) => {
    setStudentDirectoryEnabled(enabled);
    localStorage.setItem('SAMS_PORTAL_STUDENT_DIRECTORY_ENABLED', JSON.stringify(enabled));
    try {
      await setDoc(doc(db, 'systemSettings', 'uiConfig'), { studentDirectoryEnabled: enabled }, { merge: true });
    } catch (e) {
      console.warn('Failed to sync student directory status:', e);
    }
    addAuditLog(userInfo?.name || 'Admin', 'TOGGLE_STUDENT_DIRECTORY', `Admin ${enabled ? 'ENABLED' : 'DISABLED'} University Roll Number editing for HOD.`);
  };

  const handleToggleSubjectCounsellingTab = async (enabled: boolean) => {
    setSubjectCounsellingTabEnabled(enabled);
    localStorage.setItem('SAMS_PORTAL_SUBJECT_COUNSELLING_ENABLED', JSON.stringify(enabled));
    try {
      await setDoc(doc(db, 'systemSettings', 'uiConfig'), { subjectCounsellingEnabled: enabled }, { merge: true });
    } catch (e) {
      console.warn('Failed to sync subject counselling tab status:', e);
    }
    addAuditLog(userInfo?.name || 'Admin', 'TOGGLE_SUBJECT_COUNSELLING_TAB', `Admin ${enabled ? 'ENABLED' : 'DISABLED'} Subject Counselling tab.`);
  };

  const handleUpdateProspectusUrl = async (url: string) => {
    setProspectusUrl(url);
    localStorage.setItem('sams_common_prospectus_url', url);
    try {
      await setDoc(doc(db, 'systemSettings', 'uiConfig'), { prospectusUrl: url }, { merge: true });
    } catch (e) {
      console.warn('Failed to sync prospectus URL:', e);
    }
    addAuditLog(userInfo?.name || 'Admin', 'UPDATE_PROSPECTUS_URL', `Admin updated Common Prospectus URL to: ${url}`);
  };

  const handleUpdateCollegeLogo = async (logoUrl: string) => {
    setCollegeLogoUrl(logoUrl);
    try {
      localStorage.setItem('sams_college_logo_url', logoUrl);
      await setDoc(doc(db, 'systemSettings', 'uiConfig'), { collegeLogoUrl: logoUrl }, { merge: true });
    } catch (e) {
      console.warn('Failed to sync college logo URL:', e);
    }
    addAuditLog(userInfo?.name || 'Admin', 'UPDATE_COLLEGE_LOGO', logoUrl ? 'Admin updated college logo.' : 'Admin reset college logo to default emblem.');
  };

  const syncMissingStudentsToCloud = async (allStudents: Student[], cloudStudents: Student[]) => {
    if (isFirestoreQuotaExhausted()) return;
    const cloudMap = new Map<string, Student>();
    cloudStudents.forEach(s => cloudMap.set(s.id, s));

    const missingOrUpdated = allStudents.filter(s => {
      const existing = cloudMap.get(s.id);
      if (!existing) return true;
      if ((s.lastModified || 0) > (existing.lastModified || 0)) return true;
      return false;
    });

    if (missingOrUpdated.length === 0) return;

    try {
      const batchSize = 100;
      for (let i = 0; i < missingOrUpdated.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = missingOrUpdated.slice(i, i + batchSize);
        chunk.forEach(s => batch.set(doc(db, 'students', s.id), s, { merge: true }));
        await batch.commit();
      }
    } catch (err: any) {
      if (isQuotaError(err)) {
        markQuotaExhausted();
        setIsQuotaLimited(true);
      }
      console.warn('Batch write notice during student cloud sync:', err);
    }
  };

  // Load from Firestore & Setup Real-time Listeners
  useEffect(() => {
    // 1. INITIAL SEEDING & ONE-TIME LOADS
    const initializeData = async () => {
      try {
        clearQuotaExhausted();
        setIsQuotaLimited(false);

        // Seed departments if empty
        const deptSnap = await getDocs(collection(db, 'departments'));
        if (deptSnap.empty) {
          for (const d of INITIAL_DEPARTMENTS) {
            await setDoc(doc(db, 'departments', d.id), d).catch(console.warn);
          }
        }

        // Seed faculty if empty
        const facSnap = await getDocs(collection(db, 'faculty'));
        if (facSnap.empty) {
          for (const f of INITIAL_FACULTY) {
            await setDoc(doc(db, 'faculty', f.id), f).catch(console.warn);
          }
        }

        // Seed notices if empty
        const noticeSnap = await getDocs(collection(db, 'notices'));
        if (noticeSnap.empty) {
          for (const n of INITIAL_NOTICES) {
            await setDoc(doc(db, 'notices', n.id), n).catch(console.warn);
          }
        }

        // Seed applications if empty
        const appSnap = await getDocs(collection(db, 'applications'));
        if (appSnap.empty) {
          for (const a of INITIAL_APPLICATIONS) {
            await setDoc(doc(db, 'applications', a.id), a).catch(console.warn);
          }
        }

        // Seed students if empty
        const studentSnap = await getDocs(collection(db, 'students'));
        if (studentSnap.empty && SAMS_MASTER_STUDENTS.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < SAMS_MASTER_STUDENTS.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = SAMS_MASTER_STUDENTS.slice(i, i + batchSize);
            chunk.forEach(s => batch.set(doc(db, 'students', s.id), s, { merge: true }));
            await batch.commit().catch(console.warn);
          }
        }

        // Seed HOD credentials if missing
        const hodSnap = await getDoc(doc(db, 'systemSettings', 'hodCredentials')).catch(() => null);
        if (!hodSnap || !hodSnap.exists() || !hodSnap.data()?.accounts || hodSnap.data()?.accounts.length === 0) {
          await setDoc(doc(db, 'systemSettings', 'hodCredentials'), { accounts: DEFAULT_HOD_ACCOUNTS, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.warn);
        }

        // Initial UI Config fetch
        const uiConfigSnap = await getDoc(doc(db, 'systemSettings', 'uiConfig')).catch(() => null);
        if (uiConfigSnap && uiConfigSnap.exists()) {
          const data = uiConfigSnap.data();
          if (typeof data.studentIdEnabled === 'boolean') setStudentIdTabEnabled(data.studentIdEnabled);
          if (typeof data.studentDirectoryEnabled === 'boolean') setStudentDirectoryEnabled(data.studentDirectoryEnabled);
          if (typeof data.subjectCounsellingEnabled === 'boolean') setSubjectCounsellingTabEnabled(data.subjectCounsellingEnabled);
          if (typeof data.prospectusUrl === 'string') setProspectusUrl(data.prospectusUrl);
          if (typeof data.collegeLogoUrl === 'string') setCollegeLogoUrl(data.collegeLogoUrl);
        }
      } catch (err: any) {
        if (isQuotaError(err)) {
          markQuotaExhausted();
          setIsQuotaLimited(true);
        }
        console.warn('Initial Firestore data check notice:', err);
      }
    };

    initializeData();

    // 2. REAL-TIME LISTENERS with Error Handlers (catches quota errors cleanly)
    const handleListenerError = (name: string) => (err: any) => {
      if (isQuotaError(err)) {
        markQuotaExhausted();
        setIsQuotaLimited(true);
      }
      console.warn(`Firestore ${name} listener notice:`, err);
    };

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap: any) => {
      const loaded: Department[] = [];
      snap.forEach((d: any) => loaded.push({ id: d.id, ...d.data() } as Department));
      if (loaded.length > 0) setDepartments(loaded);
    }, handleListenerError('departments'));

    const unsubFaculty = onSnapshot(collection(db, 'faculty'), (snap: any) => {
      const loaded: Faculty[] = [];
      snap.forEach((f: any) => loaded.push({ id: f.id, ...f.data() } as Faculty));
      if (loaded.length > 0) setFaculty(loaded);
    }, handleListenerError('faculty'));

    const unsubStudents = onSnapshot(collection(db, 'students'), (snap: any) => {
      const loaded: Student[] = [];
      snap.forEach((s: any) => loaded.push({ id: s.id, ...s.data() } as Student));
      
      const deduplicated = new Map<string, Student>();
      const barcodeToId = new Map<string, string>();

      // Read local cache first so uploaded Excel file records NOT YET in Firestore are NEVER wiped out on refresh!
      let currentLocal = getActiveStudentsCache() || [];
      const savedSettings = getLocalSyncSettings();
      if (savedSettings.savedFileStudents && savedSettings.savedFileStudents.length > currentLocal.length) {
        currentLocal = savedSettings.savedFileStudents;
      }
      if (SAMS_MASTER_STUDENTS.length > currentLocal.length) {
        currentLocal = SAMS_MASTER_STUDENTS;
      }

      currentLocal.forEach(s => {
        deduplicated.set(s.id, s);
        if (s.barcode && s.barcode.length > 3) {
          barcodeToId.set(s.barcode.trim().toUpperCase(), s.id);
        }
      });

      // Overlay Firestore snapshot
      const sortedByTime = [...loaded].sort((a, b) => (a.lastModified || 0) - (b.lastModified || 0));

      for (const s of sortedByTime) {
        let targetId = s.id;
        const cleanB = s.barcode && s.barcode.length > 3 ? s.barcode.trim().toUpperCase() : '';
        const conflictId = cleanB ? barcodeToId.get(cleanB) : null;
        
        if (conflictId) {
          targetId = conflictId;
        }

        const existingLocal = deduplicated.get(targetId);
        // Update if local record doesn't exist or Firestore record is newer/equal
        if (!existingLocal || (s.lastModified || 0) >= (existingLocal.lastModified || 0)) {
          deduplicated.set(targetId, s);
          if (cleanB) barcodeToId.set(cleanB, targetId);
        }
      }

      const finalLoaded = Array.from(deduplicated.values());
      finalLoaded.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
      
      setStudents(finalLoaded);
      saveActiveStudentsCache(finalLoaded);

      // Multi-device sync healing: Push missing records to Firestore in background
      if (loaded.length < finalLoaded.length) {
        syncMissingStudentsToCloud(finalLoaded, loaded);
      }
    }, handleListenerError('students'));

    const unsubApps = onSnapshot(collection(db, 'applications'), (snap: any) => {
      const loaded: Application[] = [];
      snap.forEach((a: any) => loaded.push({ id: a.id, ...a.data() } as Application));
      if (loaded.length > 0) setApplications(loaded);
    }, handleListenerError('applications'));

    const unsubNotices = onSnapshot(collection(db, 'notices'), (snap: any) => {
      const loaded: Notice[] = [];
      snap.forEach((n: any) => loaded.push({ id: n.id, ...n.data() } as Notice));
      if (loaded.length > 0) setNotices(loaded);
    }, handleListenerError('notices'));

    const unsubLogs = onSnapshot(query(collection(db, 'auditLogs')), (snap: any) => {
      const loaded: AuditLog[] = [];
      snap.forEach((l: any) => loaded.push({ id: l.id, ...l.data() } as AuditLog));
      loaded.sort((a, b) => b.id.localeCompare(a.id));
      if (loaded.length > 0) setAuditLogs(loaded);
    }, handleListenerError('auditLogs'));

    const unsubSpotRound = onSnapshot(doc(db, 'systemSettings', 'spotRoundConfig'), (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.enabled === 'boolean') {
          setIsSpotRoundEnabled(data.enabled);
          localStorage.setItem('SAMS_SPOT_ROUND_ENABLED', JSON.stringify(data.enabled));
        }
      } else {
        // Auto-create initial spotRoundConfig document in Firestore if not present
        setDoc(doc(db, 'systemSettings', 'spotRoundConfig'), { enabled: true }, { merge: true }).catch(console.warn);
      }
    }, handleListenerError('spotRoundConfig'));

    const unsubUIConfig = onSnapshot(doc(db, 'systemSettings', 'uiConfig'), (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.studentIdEnabled === 'boolean') setStudentIdTabEnabled(data.studentIdEnabled);
        if (typeof data.studentDirectoryEnabled === 'boolean') setStudentDirectoryEnabled(data.studentDirectoryEnabled);
        if (typeof data.subjectCounsellingEnabled === 'boolean') setSubjectCounsellingTabEnabled(data.subjectCounsellingEnabled);
        if (typeof data.prospectusUrl === 'string') setProspectusUrl(data.prospectusUrl);
        if (typeof data.collegeLogoUrl === 'string') setCollegeLogoUrl(data.collegeLogoUrl);
      }
    }, handleListenerError('uiConfig'));

    const unsubSanctionedSeats = onSnapshot(doc(db, 'systemSettings', 'sanctionedSeats'), (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.seats) {
          setSanctionedSeatsMap(data.seats);
          localStorage.setItem('SAMS_SANCTIONED_SEATS_MAP', JSON.stringify(data.seats));
        }
        if (data.defaultSeats) {
          setDefaultSeatsMap(data.defaultSeats);
          localStorage.setItem('SAMS_DEFAULT_SANCTIONED_SEATS', JSON.stringify(data.defaultSeats));
        }
        if (data.lastUpdated) {
          const meta: SanctionedSeatsMeta = {
            lastUpdated: data.lastUpdated,
            updatedBy: data.updatedBy || 'Admin',
            isDefault: Boolean(data.isDefault),
            totalStrength: data.totalStrength
          };
          setSeatsMeta(meta);
          localStorage.setItem('SAMS_SANCTIONED_SEATS_META', JSON.stringify(meta));
        }
      }
    }, handleListenerError('sanctionedSeats'));

    const unsubHodCredentials = onSnapshot(doc(db, 'systemSettings', 'hodCredentials'), (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.accounts)) {
          setHodAccounts(data.accounts);
          localStorage.setItem('SAMS_HOD_CREDENTIALS_ACCOUNTS', JSON.stringify(data.accounts));
        }
      }
    }, handleListenerError('hodCredentials'));

    return () => {
      unsubDepts();
      unsubFaculty();
      unsubStudents();
      unsubApps();
      unsubNotices();
      unsubLogs();
      unsubSpotRound();
      unsubUIConfig();
      unsubSanctionedSeats();
      unsubHodCredentials();
    };
  }, []);

  // Helper to check if two student records are substantively identical
  const areStudentsEqual = (a: Student, b: Student): boolean => {
    return (
      (a.rollNumber || '') === (b.rollNumber || '') &&
      (a.barcode || '') === (b.barcode || '') &&
      (a.name || '') === (b.name || '') &&
      (a.gender || '') === (b.gender || '') &&
      (a.departmentName || '') === (b.departmentName || '') &&
      (a.departmentId || '') === (b.departmentId || '') &&
      (a.subject || '') === (b.subject || '') &&
      (a.fatherName || '') === (b.fatherName || '') &&
      (a.motherName || '') === (b.motherName || '') &&
      (a.phone || '') === (b.phone || '') &&
      (a.email || '') === (b.email || '') &&
      (a.universityRollNumber || '') === (b.universityRollNumber || '') &&
      (a.aadhaarCard || '') === (b.aadhaarCard || '') &&
      (a.category || '') === (b.category || '') &&
      (a.stream || '') === (b.stream || '') &&
      (a.apaarId || '') === (b.apaarId || '') &&
      (a.myBharatId || '') === (b.myBharatId || '')
    );
  };

  // Core synchronization logic with real-time deduplication, delta-only writing, and quota protection
  const syncStudentsWithCleanup = async (newStudents: Student[]) => {
    if (!newStudents || newStudents.length === 0) return [];

    // Use current DB or local state to identify conflicts and existing fields
    let currentDB: Student[] = [];
    try {
      if (!isFirestoreQuotaExhausted()) {
        const snap = await getDocs(collection(db, 'students'));
        snap.forEach(d => currentDB.push({ id: d.id, ...d.data() } as Student));
      }
    } catch (e: any) {
      if (isQuotaError(e)) {
        markQuotaExhausted();
        setIsQuotaLimited(true);
      }
      console.warn('Sync cleanup: could not fetch latest DB, falling back to state cache', e);
    }
    
    if (currentDB.length === 0) {
      currentDB = [...students];
    }

    const currentMap = new Map<string, Student>();
    const currentBarcodeMap = new Map<string, Student>();
    currentDB.forEach(s => {
      currentMap.set(s.id, s);
      if (s.barcode && s.barcode.length > 3) {
        currentBarcodeMap.set(s.barcode, s);
      }
    });

    const incomingMap = new Map<string, Student>();
    const barcodeMapIncoming = new Map<string, string>(); 

    // 1. Process incoming list: deduplicate by barcode, preserve existing manual edits (Univ Roll No)
    for (const s of newStudents) {
      // Find matching existing record to preserve manual edits like universityRollNumber
      const existingRecord = currentMap.get(s.id) || (s.barcode && s.barcode.length > 3 ? currentBarcodeMap.get(s.barcode) : null);
      
      const preservedUnivRoll = s.universityRollNumber || existingRecord?.universityRollNumber || '';
      
      const studentCleaned: Student = {
        ...s,
        universityRollNumber: preservedUnivRoll,
        lastModified: s.lastModified || existingRecord?.lastModified || Date.now()
      };
      
      // Deduplicate strictly by barcode (User Request 8: only barcode into account, not roll number)
      if (s.barcode && s.barcode.length > 3) {
        const cleanBarcode = s.barcode.trim().toUpperCase();
        if (barcodeMapIncoming.has(cleanBarcode)) {
          const prevId = barcodeMapIncoming.get(cleanBarcode)!;
          const prevRecord = incomingMap.get(prevId);
          // Keep the one with later lastModified
          if (prevRecord && (prevRecord.lastModified || 0) > (studentCleaned.lastModified || 0)) {
            continue; // Keep existing record, skip this older duplicate
          }
          incomingMap.delete(prevId);
        }
        barcodeMapIncoming.set(cleanBarcode, s.id);
      }

      incomingMap.set(s.id, studentCleaned);
    }

    const uniqueIncoming = Array.from(incomingMap.values());
    uniqueIncoming.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));

    // 2. Compute DELTAS: Only write documents that are brand new or actually changed!
    const recordsToWrite: Student[] = [];
    for (const ns of uniqueIncoming) {
      const existing = currentMap.get(ns.id) || (ns.barcode ? currentBarcodeMap.get(ns.barcode) : null);
      if (!existing || !areStudentsEqual(existing, ns)) {
        recordsToWrite.push(ns);
      }
    }

    // Identify conflicts to delete from DB (Barcode only)
    const idsToDelete = new Set<string>();
    for (const ns of uniqueIncoming) {
      if (ns.barcode && ns.barcode.length > 3) {
        const conflicts = currentDB.filter(os => 
          os.id !== ns.id && os.barcode && os.barcode.length > 3 && os.barcode.trim().toUpperCase() === ns.barcode.trim().toUpperCase()
        );
        conflicts.forEach(c => idsToDelete.add(c.id));
      }
    }

    // 3. Always update local state & browser storage immediately
    setStudents(uniqueIncoming);
    saveActiveStudentsCache(uniqueIncoming);

    // 4. Firestore Write Protection: If quota is exhausted or 0 changes needed, finish now!
    if (isFirestoreQuotaExhausted() || (recordsToWrite.length === 0 && idsToDelete.size === 0)) {
      return uniqueIncoming;
    }

    // 5. Safely execute batches with quota catch
    try {
      const batchSize = 100;
      
      // Delete conflicts
      const deleteList = Array.from(idsToDelete);
      for (let i = 0; i < deleteList.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = deleteList.slice(i, i + batchSize);
        chunk.forEach(id => batch.delete(doc(db, 'students', id)));
        await batch.commit();
      }

      // Set/Update ONLY changed or new records (Delta-only writes!)
      for (let i = 0; i < recordsToWrite.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = recordsToWrite.slice(i, i + batchSize);
        chunk.forEach(s => batch.set(doc(db, 'students', s.id), s, { merge: true }));
        await batch.commit();
      }
    } catch (err: any) {
      if (isQuotaError(err)) {
        markQuotaExhausted();
        setIsQuotaLimited(true);
        console.warn('Firestore write batch reached daily free-tier quota. All student records remain safely active in local memory.');
      } else {
        console.warn('Firestore write batch warning:', err);
      }
    }

    return uniqueIncoming;
  };

  const handleLoginSuccess = (role: 'admin' | 'hod' | 'student', info: { name: string; email: string; deptId?: string }) => {
    setUserRole(role);
    setUserInfo(info);
    try {
      localStorage.setItem('SAMS_PORTAL_USER_ROLE', role);
      localStorage.setItem('SAMS_PORTAL_USER_INFO', JSON.stringify(info));
    } catch (e) {
      console.error('Failed to persist user session', e);
    }
    addAuditLog(info.name, 'USER_LOGIN', `Successfully logged in as ${role.toUpperCase()} (${info.email})`);
  };

  const handleLogout = () => {
    if (userInfo) {
      addAuditLog(userInfo.name, 'USER_LOGOUT', `Logged out from portal.`);
    }
    setUserRole(null);
    setUserInfo(null);
    try {
      localStorage.removeItem('SAMS_PORTAL_USER_ROLE');
      localStorage.removeItem('SAMS_PORTAL_USER_INFO');
    } catch (e) {
      console.error('Failed to clear user session', e);
    }
    auth.signOut();
  };

  const addAuditLog = async (userName: string, action: string, details: string) => {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newLog: AuditLog = {
      id: logId,
      userId: userInfo?.email || 'guest',
      userName,
      action,
      details,
      timestamp: new Date().toLocaleString()
    };
    setAuditLogs(prev => [newLog, ...prev]);
    try {
      await setDoc(doc(db, 'auditLogs', logId), newLog, { merge: true });
    } catch (e) {
      console.warn('Error saving audit log to firestore:', e);
    }
  };

  const handleAddApplication = async (appData: Omit<Application, 'id' | 'applicationNumber' | 'createdAt'>) => {
    const appNumber = `SAMS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newApp: Application = {
      ...appData,
      id: `app-${Date.now()}`,
      applicationNumber: appNumber,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setApplications(prev => [newApp, ...prev]);
    await setDoc(doc(db, 'applications', newApp.id), newApp);

    // Update filled seats in department
    setDepartments(prev => prev.map(d => {
      if (d.id === newApp.departmentId) {
        const updated = { ...d, filledSeats: Math.min(d.totalSeats, d.filledSeats + 1) };
        // Sync to Firestore
        setDoc(doc(db, 'departments', d.id), updated).catch(console.error);
        return updated;
      }
      return d;
    }));

    // Also add to student list automatically for demo convenience
    const rawRoll = `${newApp.departmentName.substring(0, 3).toUpperCase()}26-${Math.floor(100 + Math.random() * 900)}`;
    const rawBarcode = `26D${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Deterministic ID for new application students
    const studentId = `sams-${rawBarcode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const newStudent: Student = {
      id: studentId,
      rollNumber: rawRoll,
      barcode: rawBarcode,
      name: newApp.studentName,
      gender: 'Male',
      email: newApp.email,
      phone: newApp.phone,
      stream: newApp.departmentName.includes('Science') ? 'Physical Science' : newApp.departmentName.includes('Commerce') ? 'Commerce' : 'Arts',
      departmentId: newApp.departmentId,
      departmentName: newApp.departmentName,
      subject: newApp.departmentName,
      semester: '1st Semester',
      admissionDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      lastModified: Date.now()
    };
    setStudents(prev => [newStudent, ...prev]);
    await setDoc(doc(db, 'students', newStudent.id), newStudent, { merge: true }).catch(console.error);

    addAuditLog(
      userInfo?.name || 'Applicant', 
      'SUBMIT_APPLICATION', 
      `Submitted UG application ${appNumber} for ${newApp.departmentName} (${newApp.studentName})`
    );
  };

  const handleUpdateDepartment = async (updatedDept: Department) => {
    setDepartments(prev => prev.map(d => d.id === updatedDept.id ? updatedDept : d));
    await setDoc(doc(db, 'departments', updatedDept.id), updatedDept).catch(console.error);
    addAuditLog(
      userInfo?.name || 'HOD/Admin',
      'UPDATE_DEPARTMENT',
      `Updated course details & capacity for ${updatedDept.name} (Seats: ${updatedDept.filledSeats}/${updatedDept.totalSeats})`
    );
  };

  const handleUpdateStudent = async (updatedStudent: Student) => {
    // 1. Calculate the deterministic ID based on updated barcode
    let finalId = updatedStudent.id;
    const rawBarcode = updatedStudent.barcode;
    
    if (rawBarcode && rawBarcode.length > 3) {
      finalId = `sams-${rawBarcode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }

    const isIdChanging = finalId !== updatedStudent.id;
    const studentWithNewId = { 
      ...updatedStudent, 
      id: finalId,
      lastModified: Date.now() // Always update timestamp on manual edit
    };

    // 2. Check for conflicts with OTHER students in the local state (Barcode only)
    const conflict = students.find(s => 
      s.id !== updatedStudent.id && s.id !== finalId && (
        (rawBarcode && rawBarcode.length > 3 && s.barcode === rawBarcode)
      )
    );

    if (conflict) {
      const confirmMerge = window.confirm(`Another record exists for ${conflict.name} with the same Barcode/Roll Number. Should we merge these records? (The current edits will overwrite conflicting fields)`);
      if (!confirmMerge) return;
    }

    // 3. OPTIMISTIC UPDATE FIRST: Immediately save to local state & browser storage so user never loses edits!
    setStudents(prev => {
      const filtered = prev.filter(s => s.id !== updatedStudent.id && s.id !== (conflict?.id || ''));
      const updated = [...filtered, studentWithNewId].sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
      saveActiveStudentsCache(updated);
      return updated;
    });

    addAuditLog(
      userInfo?.name || 'HOD/Admin',
      'UPDATE_STUDENT_RECORD',
      `Updated details for student ${studentWithNewId.name} (${studentWithNewId.rollNumber}). ${isIdChanging ? 'Record ID migrated.' : ''} ${conflict ? 'Conflict merged.' : ''}`
    );

    // 4. Safely attempt Firestore write if quota allows
    if (!isFirestoreQuotaExhausted()) {
      try {
        if (conflict) {
          await deleteDoc(doc(db, 'students', conflict.id));
        }

        if (isIdChanging) {
          await deleteDoc(doc(db, 'students', updatedStudent.id));
        }

        await setDoc(doc(db, 'students', finalId), studentWithNewId, { merge: true });
      } catch (e: any) {
        if (isQuotaError(e)) {
          markQuotaExhausted();
          setIsQuotaLimited(true);
          console.warn('Student update saved to local storage (cloud quota reached).');
        } else {
          console.warn('Firestore update error:', e);
        }
      }
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (userRole !== 'admin') {
      alert('Only Super Admin is authorized to delete student records.');
      return;
    }
    const confirmDelete = window.confirm('Are you sure you want to delete this student record?');
    if (!confirmDelete) return;

    setStudents(prev => {
      const updated = prev.filter(s => s.id !== studentId);
      saveActiveStudentsCache(updated);
      return updated;
    });
    addAuditLog(
      userInfo?.name || 'Admin',
      'DELETE_STUDENT_RECORD',
      `Deleted student record ID ${studentId}`
    );

    if (!isFirestoreQuotaExhausted()) {
      try {
        await deleteDoc(doc(db, 'students', studentId));
      } catch (err: any) {
        if (isQuotaError(err)) {
          markQuotaExhausted();
          setIsQuotaLimited(true);
        }
      }
    }
  };

  const handleDeleteAllStudents = async () => {
    if (userRole !== 'admin') {
      alert('Only Super Admin is authorized to perform bulk cleanup.');
      return;
    }
    const confirmDelete = window.confirm('CRITICAL ACTION: Are you sure you want to PERMANENTLY DELETE ALL student records from the database? This is usually done before a fresh sync to fix duplicates. THIS CANNOT BE UNDONE.');
    if (!confirmDelete) return;

    const secondConfirm = window.confirm('LAST WARNING: Are you absolutely sure? All University Roll Numbers and manual edits will be lost.');
    if (!secondConfirm) return;

    setIsSyncing(true);
    setStudents([]);
    saveActiveStudentsCache([]);
    
    addAuditLog(
      userInfo?.name || 'Admin',
      'BULK_DELETE_STUDENTS',
      `Admin performed a bulk cleanup, deleting student records.`
    );

    if (!isFirestoreQuotaExhausted()) {
      try {
        const batchSize = 100;
        for (let i = 0; i < students.length; i += batchSize) {
          const batch = students.slice(i, i + batchSize);
          await Promise.all(batch.map(s => deleteDoc(doc(db, 'students', s.id))));
        }
      } catch (err: any) {
        if (isQuotaError(err)) {
          markQuotaExhausted();
          setIsQuotaLimited(true);
        }
      }
    }

    setIsSyncing(false);
    alert('Bulk cleanup complete. All student records have been removed. You can now perform a fresh synchronization.');
  };

  const handleAddFaculty = async (newFac: Omit<Faculty, 'id'>) => {
    const id = `fac-${Date.now()}`;
    const facObj: Faculty = { id, ...newFac };
    await setDoc(doc(db, 'faculty', id), facObj);
    setFaculty(prev => [...prev, facObj]);
    await addAuditLog(
      userInfo?.name || 'HOD/Admin',
      'ADD_FACULTY',
      `Added faculty member ${facObj.name} (${facObj.departmentName})`
    );
  };

  const handleUpdateFaculty = async (updatedFac: Faculty) => {
    await setDoc(doc(db, 'faculty', updatedFac.id), updatedFac, { merge: true });
    setFaculty(prev => prev.map(f => f.id === updatedFac.id ? updatedFac : f));
    await addAuditLog(
      userInfo?.name || 'HOD/Admin',
      'UPDATE_FACULTY',
      `Updated faculty details for ${updatedFac.name} (${updatedFac.departmentName})`
    );
  };

  const handleDeleteFaculty = async (facId: string) => {
    const target = faculty.find(f => f.id === facId);
    await deleteDoc(doc(db, 'faculty', facId));
    setFaculty(prev => prev.filter(f => f.id !== facId));
    if (target) {
      await addAuditLog(
        userInfo?.name || 'HOD/Admin',
        'DELETE_FACULTY',
        `Removed faculty member ${target.name} from directory`
      );
    }
  };

  const handleSyncGoogleSheet = async () => {
    setIsSyncing(true);
    try {
      const result = await createAndSyncSamsMasterData();
      if (result && result.students && result.students.length > 0) {
        const updated = await syncStudentsWithCleanup(result.students);
        if (updated) {
          setStudents(updated.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || '')));
        }
      }
      setIsSyncing(false);
      addAuditLog(
        userInfo?.name || 'Admin',
        'SYNC_GOOGLE_SHEETS',
        `Successfully created/synced Google Sheet 'SAMS_MASTER_DATA' in Drive with ${result.students.length} student records.`
      );
      alert(`Google Sheet 'SAMS_MASTER_DATA' created & synchronized successfully!`);
    } catch (err: any) {
      setIsSyncing(false);
      console.error('Google Sheets sync error:', err);
      alert(`Google Sheets sync failed: ${err.message || 'Check authentication scopes'}`);
    }
  };

  const handleSyncFromSource = async (
    sourceType: 'url' | 'file',
    sourceLabel: string,
    newStudents: Student[],
    fileSize?: number
  ) => {
    setIsSyncing(true);
    try {
      const updated = await syncStudentsWithCleanup(newStudents);
      if (updated) {
        const sorted = [...updated].sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
        setStudents(sorted);
        saveActiveStudentsCache(sorted);
      }

      addAuditLog(
        userInfo?.name || 'Admin',
        sourceType === 'url' ? 'SYNC_SAMS_URL' : 'SYNC_SAMS_FILE',
        sourceType === 'url'
          ? `Successfully synchronized and saved ${newStudents.length} student records from sheet URL: ${sourceLabel}`
          : `Successfully uploaded and saved ${newStudents.length} student records from file: ${sourceLabel}`
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const getCurrentSystemPayload = (): SystemBackupPayload => {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      createdBy: userInfo?.name || 'Mrutyunjay Malik (Super Admin)',
      summary: {
        studentsCount: students.length,
        applicationsCount: applications.length,
        facultyCount: faculty.length,
        noticesCount: notices.length,
        departmentsCount: departments.length
      },
      data: {
        students,
        applications,
        faculty,
        notices,
        departments,
        sanctionedSeatsMap,
        spotRoundSettings: { enabled: isSpotRoundEnabled },
        hodAccounts,
        auditLogs
      }
    };
  };

  const handleRestoreSystemData = async (payload: SystemBackupPayload) => {
    if (!payload || !payload.data) return;

    const restoredData = payload.data;

    if (Array.isArray(restoredData.students) && restoredData.students.length > 0) {
      setStudents(restoredData.students);
      saveActiveStudentsCache(restoredData.students);
      localStorage.setItem('SAMS_SAVED_FILE_STUDENTS', JSON.stringify(restoredData.students));
    }

    if (Array.isArray(restoredData.applications)) {
      setApplications(restoredData.applications);
    }

    if (Array.isArray(restoredData.faculty)) {
      setFaculty(restoredData.faculty);
    }

    if (Array.isArray(restoredData.notices)) {
      setNotices(restoredData.notices);
    }

    if (Array.isArray(restoredData.departments)) {
      setDepartments(restoredData.departments);
    }

    if (restoredData.sanctionedSeatsMap) {
      setSanctionedSeatsMap(restoredData.sanctionedSeatsMap);
      localStorage.setItem('SAMS_SANCTIONED_SEATS_MAP', JSON.stringify(restoredData.sanctionedSeatsMap));
    }

    if (Array.isArray(restoredData.hodAccounts)) {
      setHodAccounts(restoredData.hodAccounts);
      localStorage.setItem('SAMS_HOD_CREDENTIALS_ACCOUNTS', JSON.stringify(restoredData.hodAccounts));
    }

    if (Array.isArray(restoredData.auditLogs)) {
      setAuditLogs(restoredData.auditLogs);
    }

    if (restoredData.spotRoundSettings && typeof restoredData.spotRoundSettings.enabled === 'boolean') {
      handleToggleSpotRound(restoredData.spotRoundSettings.enabled);
    }

    // Push restored student data to Firestore if not quota exhausted
    if (!isFirestoreQuotaExhausted() && Array.isArray(restoredData.students)) {
      try {
        const batchSize = 400;
        for (let i = 0; i < restoredData.students.length; i += batchSize) {
          const batch = writeBatch(db);
          const chunk = restoredData.students.slice(i, i + batchSize);
          chunk.forEach(s => {
            if (s.id) {
              batch.set(doc(db, 'students', s.id), s, { merge: true });
            }
          });
          await batch.commit();
        }
      } catch (e) {
        console.warn('Firestore restore sync warning:', e);
      }
    }

    addAuditLog(
      userInfo?.name || 'Super Admin',
      'GOOGLE_DRIVE_RESTORE',
      `Restored complete system state from Google Drive backup (${restoredData.students?.length || 0} students).`
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        userInfo={userInfo}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        isSpotRoundEnabled={isSpotRoundEnabled}
        onToggleSpotRound={handleToggleSpotRound}
        collegeLogoUrl={collegeLogoUrl}
        onUpdateCollegeLogo={handleUpdateCollegeLogo}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {isQuotaLimited && (
          <div className="mb-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-sm animate-fade-in">
            <div className="flex items-center space-x-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <div>
                <span className="font-semibold">High-Speed Local Storage Mode Active:</span>
                <span className="ml-1 text-amber-800 dark:text-amber-300">
                  Cloud daily write limit reached (Firestore Free tier). All 1,097 student records, directory search, and University Roll Number edits are safely preserved in browser storage and fully operational.
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 whitespace-nowrap ml-3">
              Quota Protection
            </span>
          </div>
        )}

        {activeTab === 'home' && (
          <HomeView 
            setActiveTab={setActiveTab} 
            notices={notices} 
            departments={departments} 
            students={students}
            isSpotRoundEnabled={isSpotRoundEnabled}
            userRole={userRole}
            prospectusUrl={prospectusUrl}
            onUpdateProspectusUrl={handleUpdateProspectusUrl}
          />
        )}

        {activeTab === 'seat-matrix' && (
          <SeatMatrixView 
            students={students} 
            userRole={userRole}
            sanctionedSeatsMap={sanctionedSeatsMap}
            defaultSeatsMap={defaultSeatsMap}
            seatsMeta={seatsMeta}
            onAuditLog={(action, details) => {
              addAuditLog(userInfo?.name || 'Admin', action, details);
            }}
          />
        )}

        {activeTab === 'sams-stats' && (
          <SamsStatisticsView 
            students={students}
            departments={departments}
            sanctionedSeatsMap={sanctionedSeatsMap}
            setActiveTab={setActiveTab}
            userRole={userRole}
          />
        )}

        {activeTab === 'spot-round' && (
          <SpotRoundView 
            departments={departments} 
            applications={applications} 
            onAddApplication={handleAddApplication} 
            userRole={userRole}
            isSpotRoundEnabled={isSpotRoundEnabled}
            onToggleSpotRound={handleToggleSpotRound}
            students={students}
            sanctionedSeatsMap={sanctionedSeatsMap}
          />
        )}

        {activeTab === 'admission' && (
          <AdmissionApplyView 
            departments={departments} 
            applications={applications} 
            onAddApplication={handleAddApplication} 
          />
        )}

        {activeTab === 'students' && (
          <StudentDatabaseView 
            students={students} 
            userRole={userRole}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onSyncGoogleSheet={handleSyncGoogleSheet} 
            onSyncFromSource={handleSyncFromSource}
            onDeleteAllStudents={handleDeleteAllStudents}
            isSyncing={isSyncing} 
          />
        )}

        {activeTab === 'faculty' && (
          <FacultyView 
            faculty={faculty}
            students={students}
            departments={departments}
            userRole={userRole}
            userInfo={userInfo}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onAddFaculty={handleAddFaculty}
            onUpdateFaculty={handleUpdateFaculty}
            onDeleteFaculty={handleDeleteFaculty}
          />
        )}

        {activeTab === 'hod-portal' && (
          <HodPortalView 
            departments={departments} 
            students={students}
            faculty={faculty}
            userRole={userRole} 
            userInfo={userInfo} 
            onUpdateDepartment={handleUpdateDepartment} 
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            studentIdTabEnabled={studentIdTabEnabled}
            studentDirectoryEnabled={studentDirectoryEnabled}
            subjectCounsellingTabEnabled={subjectCounsellingTabEnabled}
            onToggleStudentIdTab={handleToggleStudentIdTab}
            onToggleStudentDirectory={handleToggleStudentDirectory}
            onToggleSubjectCounsellingTab={handleToggleSubjectCounsellingTab}
            hodAccounts={hodAccounts}
          />
        )}

        {activeTab === 'downloads' && (
          <DownloadView 
            userRole={userRole}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onAuditLog={(action, details) => addAuditLog(userInfo?.name || 'Admin', action, details)}
          />
        )}

        {activeTab === 'contact' && (
          <ContactUsView 
            userRole={userRole}
            onAuditLog={(action, details) => addAuditLog(userInfo?.name || 'Admin', action, details)}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogView 
            auditLogs={auditLogs} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-stone-900 border-t border-amber-200 dark:border-stone-800 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-600 dark:text-stone-400">
          <p>© 2026 SAMS Panchayat College, Baragada (Govt. of Odisha). All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-amber-700 cursor-pointer" onClick={() => setActiveTab('home')}>Portal Home</span>
            <span className="hover:text-amber-700 cursor-pointer" onClick={() => setActiveTab('sams-stats')}>SAMS Statistics</span>
            {(isSpotRoundEnabled || userRole === 'admin') && (
              <span className="hover:text-amber-700 cursor-pointer" onClick={() => setActiveTab('spot-round')}>Spot Round Seats</span>
            )}
            {userRole === 'admin' ? (
              <span className="hover:text-amber-700 cursor-pointer" onClick={() => setActiveTab('students')}>Database & Sheets Sync</span>
            ) : (
              <span className="hover:text-amber-700 cursor-pointer" onClick={() => setActiveTab('faculty')}>Faculty Directory</span>
            )}
          </div>
        </div>
      </footer>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <GoogleDriveBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        userRole={userRole}
        userInfo={userInfo}
        getCurrentSystemPayload={getCurrentSystemPayload}
        onRestoreSystemData={handleRestoreSystemData}
      />
    </div>
  );
}
