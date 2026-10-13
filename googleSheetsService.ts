import { getAccessToken, googleSignIn } from '../firebase';
import { Student } from '../types';
import { SAMS_MASTER_STUDENTS } from '../data/samsStudentMaster';
import { parseRowsToStudents } from './samsExcelParser';

export async function createAndSyncSamsMasterData(): Promise<{ spreadsheetId: string; students: Student[] }> {
  let token = await getAccessToken();
  if (!token) {
    const signInResult = await googleSignIn();
    if (!signInResult || !signInResult.accessToken) {
      throw new Error('Google Sign-In with Google Drive & Sheets permission is required to create or sync the Master Data sheet.');
    }
    token = signInResult.accessToken;
  }

  // 1. Check if SAMS_MASTER_DATA already exists in Drive, or create it
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='SAMS_MASTER_DATA' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const searchData = await searchRes.json();
  let spreadsheetId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;

  if (!spreadsheetId) {
    // Create new spreadsheet
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'SAMS_MASTER_DATA',
        mimeType: 'application/vnd.google-apps.spreadsheet',
      }),
    });
    const fileData = await createRes.json();
    if (!fileData.id) {
      throw new Error('Failed to create SAMS_MASTER_DATA Google Sheet in Drive.');
    }
    spreadsheetId = fileData.id;

    // Build authentic header and rows from SAMS_MASTER_STUDENTS
    const headerRow = [
      'Sl No',
      'Roll Number',
      'Barcode Number',
      'Applicant Name',
      'Gender',
      'Department / Stream',
      'Subject Name',
      'Email ID',
      'Mobile Number',
      'Semester',
      'Admission Date'
    ];

    const studentRows = SAMS_MASTER_STUDENTS.slice(0, 100).map((s, idx) => [
      idx + 1,
      s.rollNumber,
      s.barcode,
      s.name,
      s.gender,
      s.stream || s.departmentName,
      s.subject,
      s.email,
      s.phone,
      s.semester || '1st Semester',
      s.admissionDate || '23 Jun 2026'
    ]);

    await fetch(`https://sheets.googleapis.com/spreadsheets/${spreadsheetId}/values/Sheet1!A1:K${studentRows.length + 1}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headerRow, ...studentRows]
      })
    });
  }

  // 2. Fetch values from spreadsheet
  const valuesRes = await fetch(`https://sheets.googleapis.com/spreadsheets/${spreadsheetId}/values/Sheet1!A1:Z2000`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const valuesData = await valuesRes.json();
  const rows = valuesData.values || [];

  if (!rows || rows.length < 2) {
    return { spreadsheetId, students: SAMS_MASTER_STUDENTS };
  }

  const syncedStudents = parseRowsToStudents(rows);

  return { spreadsheetId, students: syncedStudents.length > 0 ? syncedStudents : SAMS_MASTER_STUDENTS };
}
