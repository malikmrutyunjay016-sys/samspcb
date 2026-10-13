import { db, doc, getDoc, setDoc } from '../firebase';
import { SyncSourceSettings, Student } from '../types';
import { isFirestoreQuotaExhausted, isQuotaError, markQuotaExhausted } from './quotaManager';

const LOCAL_STORAGE_KEY = 'SAMS_SYNC_SOURCE_SETTINGS';
const ACTIVE_STUDENTS_KEY = 'SAMS_ACTIVE_STUDENTS_CACHE';
const METHOD1_STUDENTS_KEY = 'SAMS_SAVED_URL_STUDENTS';
const METHOD2_STUDENTS_KEY = 'SAMS_SAVED_FILE_STUDENTS';

const DEFAULT_SETTINGS: SyncSourceSettings = {
  recentMethod: 'method2_file',
  recentMethodTimestamp: new Date().toISOString()
};

export function getActiveStudentsCache(): Student[] | null {
  try {
    const raw = localStorage.getItem(ACTIVE_STUDENTS_KEY);
    let activeList: Student[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        activeList = parsed;
      }
    }

    // Check saved file storage if active list is empty or smaller
    const m2Raw = localStorage.getItem(METHOD2_STUDENTS_KEY);
    if (m2Raw) {
      const parsedFile = JSON.parse(m2Raw);
      if (Array.isArray(parsedFile) && parsedFile.length > activeList.length) {
        return parsedFile;
      }
    }

    if (activeList.length > 0) {
      return activeList;
    }
  } catch (e) {
    console.warn('Could not read active students cache:', e);
  }
  return null;
}

export function saveActiveStudentsCache(students: Student[]): void {
  try {
    // Strip empty / undefined fields to minimize payload size for LocalStorage
    const minified = students.map(s => {
      const cleanObj: any = {};
      for (const k in s) {
        const val = (s as any)[k];
        if (val !== undefined && val !== null && val !== '') {
          cleanObj[k] = val;
        }
      }
      return cleanObj;
    });
    localStorage.setItem(ACTIVE_STUDENTS_KEY, JSON.stringify(minified));
  } catch (e) {
    console.warn('Could not save active students cache:', e);
  }
}

export function getLocalSyncSettings(): SyncSourceSettings {
  let settings: SyncSourceSettings = DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Could not read local sync settings:', e);
  }

  // Load students array from dedicated storage keys if not attached
  try {
    if (!settings.savedUrlStudents) {
      const m1Raw = localStorage.getItem(METHOD1_STUDENTS_KEY);
      if (m1Raw) {
        const parsed = JSON.parse(m1Raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          settings.savedUrlStudents = parsed;
        }
      }
    }
    if (!settings.savedFileStudents) {
      const m2Raw = localStorage.getItem(METHOD2_STUDENTS_KEY);
      if (m2Raw) {
        const parsed = JSON.parse(m2Raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          settings.savedFileStudents = parsed;
        }
      }
    }
  } catch (_) {}

  return settings;
}

export async function getSyncSettings(): Promise<SyncSourceSettings> {
  let local: SyncSourceSettings = getLocalSyncSettings();

  // Fetch cloud sync settings metadata from Firestore without blocking
  try {
    const docRef = doc(db, 'systemSettings', 'samsSyncSource');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const cloudData = snap.data() as SyncSourceSettings;
      local = {
        ...local,
        ...cloudData,
        savedUrlStudents: local.savedUrlStudents || [],
        savedFileStudents: local.savedFileStudents || []
      };
    }
  } catch {
    // Firestore offline/unreachable
  }

  return local;
}

export function saveSyncSettings(settings: SyncSourceSettings): void {
  const minifyList = (list: Student[]) => list.map(s => {
    const cleanObj: any = {};
    for (const k in s) {
      const val = (s as any)[k];
      if (val !== undefined && val !== null && val !== '') {
        cleanObj[k] = val;
      }
    }
    return cleanObj;
  });

  // Save students to dedicated storage keys first
  if (settings.savedUrlStudents && settings.savedUrlStudents.length > 0) {
    try {
      localStorage.setItem(METHOD1_STUDENTS_KEY, JSON.stringify(minifyList(settings.savedUrlStudents)));
    } catch (e) {
      console.warn('Saved URL students cache write error:', e);
    }
  }

  if (settings.savedFileStudents && settings.savedFileStudents.length > 0) {
    try {
      localStorage.setItem(METHOD2_STUDENTS_KEY, JSON.stringify(minifyList(settings.savedFileStudents)));
    } catch (e) {
      console.warn('Saved file students cache write error:', e);
    }
  }

  // Save lightweight metadata object to main LOCAL_STORAGE_KEY
  const metadataSettings: SyncSourceSettings = {
    recentMethod: settings.recentMethod,
    recentMethodTimestamp: settings.recentMethodTimestamp,
    savedUrl: settings.savedUrl,
    urlLastSyncedAt: settings.urlLastSyncedAt,
    urlStudentCount: settings.urlStudentCount,
    autoSyncEveryMinute: settings.autoSyncEveryMinute,
    savedFileName: settings.savedFileName,
    savedFileSize: settings.savedFileSize,
    fileLastUploadedAt: settings.fileLastUploadedAt,
    fileStudentCount: settings.fileStudentCount
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(metadataSettings));
  } catch (e) {
    console.warn('LocalStorage metadata save error:', e);
  }

  // Save metadata to Firestore background (guarded against quota exhaustion)
  (async () => {
    if (isFirestoreQuotaExhausted()) return;
    try {
      const docRef = doc(db, 'systemSettings', 'samsSyncSource');
      const firestorePayload: any = {
        recentMethod: settings.recentMethod,
        recentMethodTimestamp: settings.recentMethodTimestamp,
        savedUrl: settings.savedUrl || '',
        urlLastSyncedAt: settings.urlLastSyncedAt || '',
        urlStudentCount: settings.urlStudentCount || 0,
        autoSyncEveryMinute: settings.autoSyncEveryMinute !== false,
        savedFileName: settings.savedFileName || '',
        savedFileSize: settings.savedFileSize || 0,
        fileLastUploadedAt: settings.fileLastUploadedAt || '',
        fileStudentCount: settings.fileStudentCount || 0
      };
      await setDoc(docRef, firestorePayload, { merge: true });
    } catch (err: any) {
      if (isQuotaError(err)) {
        markQuotaExhausted();
      }
      console.warn('Firestore sync settings background save notice:', err);
    }
  })();
}

export function recordMethod1Sync(
  url: string,
  students: Student[]
): SyncSourceSettings {
  const current = getLocalSyncSettings();
  const updated: SyncSourceSettings = {
    ...current,
    recentMethod: 'method1_url',
    recentMethodTimestamp: new Date().toISOString(),
    savedUrl: url.trim(),
    urlLastSyncedAt: new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    urlStudentCount: students.length,
    savedUrlStudents: students
  };
  saveSyncSettings(updated);
  saveActiveStudentsCache(students);
  return updated;
}

export function recordMethod2Upload(
  fileName: string,
  fileSize: number,
  students: Student[]
): SyncSourceSettings {
  const current = getLocalSyncSettings();
  const updated: SyncSourceSettings = {
    ...current,
    recentMethod: 'method2_file',
    recentMethodTimestamp: new Date().toISOString(),
    savedFileName: fileName,
    savedFileSize: fileSize,
    fileLastUploadedAt: new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    fileStudentCount: students.length,
    savedFileStudents: students
  };
  saveSyncSettings(updated);
  saveActiveStudentsCache(students);
  return updated;
}
