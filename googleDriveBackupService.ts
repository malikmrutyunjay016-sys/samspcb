import { auth, googleProvider, signInWithPopup } from '../firebase';

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

export interface SystemBackupPayload {
  version: string;
  timestamp: string;
  createdBy: string;
  summary: {
    studentsCount: number;
    applicationsCount: number;
    facultyCount: number;
    noticesCount: number;
    departmentsCount: number;
  };
  data: {
    students: any[];
    applications: any[];
    faculty: any[];
    notices: any[];
    departments: any[];
    keyOfficers?: any[];
    contactInquiries?: any[];
    sanctionedSeatsMap?: Record<string, number>;
    spotRoundSettings?: any;
    hodAccounts?: any[];
    auditLogs?: any[];
  };
}

let cachedAccessToken: string | null = null;

export const setDriveAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const getDriveAccessToken = async (): Promise<string> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  // Request drive.file scope explicitly on provider
  googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

  // Trigger Google Sign-In pop-up to obtain OAuth token with Drive scope
  const result = await signInWithPopup(auth, googleProvider);
  const credential = (result as any).credential;
  
  if (!credential?.accessToken) {
    throw new Error('Google Drive authorization failed. No access token received.');
  }

  cachedAccessToken = credential.accessToken as string;
  return cachedAccessToken;
};

/**
 * List all SAMS backup files in user's Google Drive created by this app
 */
export const listGoogleDriveBackups = async (): Promise<DriveBackupFile[]> => {
  const token = await getDriveAccessToken();
  const query = encodeURIComponent("name contains 'SAMS_BACKUP_' and trashed = false");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size)&orderBy=createdTime%20desc`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to fetch backups from Google Drive (${response.status})`);
  }

  const result = await response.json();
  return result.files || [];
};

/**
 * Upload a new complete system backup JSON to Google Drive
 */
export const uploadGoogleDriveBackup = async (payload: SystemBackupPayload): Promise<DriveBackupFile> => {
  const token = await getDriveAccessToken();
  
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `SAMS_BACKUP_${timestampStr}.json`;

  const metadata = {
    name: filename,
    mimeType: 'application/json',
    description: `SAMS Panchayat College Backup created on ${new Date().toLocaleString()} by Super Admin`
  };

  const fileContent = JSON.stringify(payload, null, 2);

  const boundary = 'foo_bar_baz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to upload backup to Google Drive (${response.status})`);
  }

  const file = await response.json();
  return file;
};

/**
 * Download and parse a backup file content from Google Drive
 */
export const downloadGoogleDriveBackup = async (fileId: string): Promise<SystemBackupPayload> => {
  const token = await getDriveAccessToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to download backup file (${response.status})`);
  }

  const backupData: SystemBackupPayload = await response.json();
  if (!backupData || (!backupData.data && !Array.isArray((backupData as any).students))) {
    throw new Error('Downloaded file is not a valid SAMS backup payload.');
  }

  return backupData;
};

/**
 * Delete a backup file from Google Drive
 */
export const deleteGoogleDriveBackup = async (fileId: string): Promise<void> => {
  const token = await getDriveAccessToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to delete backup file (${response.status})`);
  }
};
