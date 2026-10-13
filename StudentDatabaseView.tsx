import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  Mail, 
  Phone, 
  PhoneCall,
  Copy,
  MessageSquare,
  MapPin,
  ChevronLeft, 
  ChevronRight, 
  Link as LinkIcon, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Database, 
  Upload, 
  Clock, 
  Check, 
  RotateCw,
  Layers,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { Student, SyncSourceSettings } from '../types';
import * as XLSX from 'xlsx';
import { parseExcelWorkbook } from '../utils/samsExcelParser';
import { 
  getSyncSettings, 
  recordMethod2Upload, 
  saveSyncSettings 
} from '../utils/syncSettingsService';

interface StudentDatabaseViewProps {
  students: Student[];
  userRole?: 'admin' | 'hod' | 'student' | null;
  onOpenLogin?: () => void;
  onSyncGoogleSheet: () => void;
  onSyncFromSource?: (
    sourceType: 'url' | 'file',
    sourceLabel: string,
    newStudents: Student[],
    fileSize?: number
  ) => void;
  onDeleteAllStudents?: () => Promise<void>;
  isSyncing: boolean;
}

export const StudentDatabaseView: React.FC<StudentDatabaseViewProps> = ({ 
  students, 
  userRole = null,
  onOpenLogin,
  onSyncGoogleSheet, 
  onSyncFromSource, 
  onDeleteAllStudents,
  isSyncing 
}) => {
  const isAdmin = userRole === 'admin';
  const isAuthorized = userRole === 'admin' || userRole === 'hod';
  // Main view tab: 'directory' or 'sync-sams'
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'sync-sams'>('directory');

  // Search & Filter state for Directory tab
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedCourseType, setSelectedCourseType] = useState<'ALL' | 'REGULAR' | 'AEDP'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Course counts for (All, Regular, AEDP)
  const courseCounts = useMemo(() => {
    let regularCount = 0;
    let aedpCount = 0;
    students.forEach(s => {
      const isAedp = (s.subject && s.subject.includes('AEDP')) || (s.rollNumber && s.rollNumber.includes('AEDP'));
      if (isAedp) aedpCount++;
      else regularCount++;
    });
    return { all: students.length, regular: regularCount, aedp: aedpCount };
  }, [students]);

  // Sync Settings state (persisting SAMS master file)
  const [syncSettings, setSyncSettings] = useState<SyncSourceSettings>({
    recentMethod: 'method2_file',
    recentMethodTimestamp: new Date().toISOString()
  });

  // Sync status state for Excel upload and reload
  const [syncStatus, setSyncStatus] = useState<{ 
    type: 'success' | 'error' | null; 
    message: string; 
    count?: number; 
    details?: string;
  }>({ type: null, message: '' });

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Copy feedback state for interactive contact info
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    const cleanText = text.replace(/[^0-9+]/g, '') || text;
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Load persistent sync settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getSyncSettings();
        setSyncSettings(settings);
      } catch (e) {
        console.error('Failed to load sync settings:', e);
      }
    };
    loadSettings();
  }, []);

  // Extract all unique subjects, keeping AEDP distinct from regular subjects
  const allUniqueSubjects = useMemo(() => {
    const subs = new Set<string>();
    students.forEach(s => {
      if (s.subject) subs.add(s.subject);
    });
    return Array.from(subs).sort((a, b) => a.localeCompare(b));
  }, [students]);

  // Stream counts & subject groupings by stream
  const streamCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'ALL': students.length,
      'Arts': 0,
      'Commerce': 0,
      'Biological Science': 0,
      'Physical Science': 0,
      'Self Financing': 0
    };
    students.forEach(s => {
      const st = s.stream || 'Arts';
      if (counts[st] !== undefined) {
        counts[st]++;
      }
    });
    return counts;
  }, [students]);

  const streamSubjectsMap = useMemo(() => {
    const map: Record<string, string[]> = {
      'Arts': [],
      'Commerce': [],
      'Biological Science': [],
      'Physical Science': [],
      'Self Financing': []
    };
    students.forEach(s => {
      const st = s.stream || 'Arts';
      const sub = s.subject;
      if (sub && map[st] && !map[st].includes(sub)) {
        map[st].push(sub);
      }
    });
    Object.keys(map).forEach(st => map[st].sort((a, b) => a.localeCompare(b)));
    return map;
  }, [students]);

  const aedpSubjects = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.subject && (s.subject.includes('AEDP') || (s.rollNumber && s.rollNumber.includes('AEDP')))) {
        set.add(s.subject);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students]);

  // Filter and sort students strictly in dictionary order by Roll Number (A to Z)
  const filteredStudents = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const result = students.filter(s => {
      if (!term) return true;
      const terms = term.split(/\s+/);
      const searchableText = [
        s.name,
        s.fatherName,
        s.motherName,
        s.parentsName,
        s.aadhaarCard,
        s.rollNumber,
        s.barcode,
        s.email,
        s.phone,
        s.address,
        s.subject,
        s.stream,
        s.departmentName,
        s.gender,
        s.category
      ].filter(Boolean).join(' ').toLowerCase();

      return terms.every(t => searchableText.includes(t));
    }).filter(s => {
      const isStudentAedp = (s.subject && s.subject.includes('AEDP')) || (s.rollNumber && s.rollNumber.includes('AEDP'));
      const matchesCourseType =
        selectedCourseType === 'ALL' ||
        (selectedCourseType === 'AEDP' && isStudentAedp) ||
        (selectedCourseType === 'REGULAR' && !isStudentAedp);

      const matchesStream = selectedStreamFilter === 'ALL' || s.stream === selectedStreamFilter;
      const matchesSubject = selectedSubjectFilter === 'ALL' || s.subject === selectedSubjectFilter;
      const matchesCategory = selectedCategoryFilter === 'ALL' || (s.category || 'GEN') === selectedCategoryFilter;
      return matchesCourseType && matchesStream && matchesSubject && matchesCategory;
    });

    // Sort students strictly by roll number in dictionary order (A to Z)
    return result.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
  }, [students, searchTerm, selectedStreamFilter, selectedSubjectFilter, selectedCategoryFilter, selectedCourseType]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const currentStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // --- SAMS Master File Upload (.xlsx, .xls, .csv) and Persistent Save ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setSyncStatus({ type: null, message: '' });

    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelWorkbook(buffer);

      if (!result.success || result.students.length === 0) {
        throw new Error(result.error || 'Failed to extract student rows from file.');
      }

      const parsed = result.students;
      parsed.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));

      // Always save the uploaded file and update database
      const updatedSettings = recordMethod2Upload(file.name, file.size, parsed);
      setSyncSettings(updatedSettings);

      if (onSyncFromSource) {
        onSyncFromSource('file', file.name, parsed, file.size);
      }

      setSyncStatus({
        type: 'success',
        message: `Successfully uploaded and synchronized ${parsed.length} student records from "${file.name}"!`,
        count: parsed.length,
        details: `Saved File: ${file.name} (${Math.round(file.size / 1024)} KB) | Range: ${parsed[0]?.rollNumber} (${parsed[0]?.name}) → ${parsed[parsed.length - 1]?.rollNumber}`
      });
    } catch (err: any) {
      setSyncStatus({
        type: 'error',
        message: `File import failed: ${err.message || 'Could not parse Excel file'}.`
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Reload / Update from Saved Master File ---
  const handleUpdateFromSavedFile = async () => {
    if (!syncSettings.savedFileStudents || syncSettings.savedFileStudents.length === 0) {
      setSyncStatus({
        type: 'error',
        message: 'No saved file data found. Please upload an Excel file (.xlsx, .xls, .csv) first.'
      });
      return;
    }

    const studentsToUse = [...syncSettings.savedFileStudents].sort((a, b) => 
      (a.rollNumber || '').localeCompare(b.rollNumber || '')
    );

    const updatedSettings: SyncSourceSettings = {
      ...syncSettings,
      recentMethod: 'method2_file',
      recentMethodTimestamp: new Date().toISOString()
    };
    saveSyncSettings(updatedSettings);
    setSyncSettings(updatedSettings);

    if (onSyncFromSource) {
      onSyncFromSource('file', syncSettings.savedFileName || 'Saved File', studentsToUse, syncSettings.savedFileSize);
    }

    setSyncStatus({
      type: 'success',
      message: `Active master database reloaded from saved file: "${syncSettings.savedFileName}". Loaded ${studentsToUse.length} student records.`,
      count: studentsToUse.length
    });
  };

  // Export to Excel and PDF Landscape
  const exportToExcel = () => {
    if (!isAuthorized) {
      alert('Student database export is restricted to Super Admin and HODs. Please log in.');
      if (onOpenLogin) onOpenLogin();
      return;
    }

    const dataToExport = filteredStudents.map((s, idx) => ({
      'Sl No': idx + 1,
      'Roll Number': s.rollNumber || '',
      'Barcode Number': s.barcode || '',
      'Applicant Name': s.name || '',
      'Father Name': s.fatherName || '',
      'Mother Name': s.motherName || '',
      'Aadhaar Card': s.aadhaarCard || '',
      'Gender': s.gender || '',
      'Category': s.category || 'GEN',
      'Stream': s.stream || s.departmentName || '',
      'Subject Name': s.subject || '',
      'Email ID': s.email || '',
      'Mobile Number': s.phone || '',
      'Address': s.address || '',
      'Semester': s.semester || '1st Semester'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, `SAMS_Student_Database_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    if (!isAuthorized) {
      alert('Student database export is restricted to Super Admin and HODs. Please log in.');
      if (onOpenLogin) onOpenLogin();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups for this website to export PDF.');
      return;
    }

    const rowsHTML = filteredStudents.map((s, idx) => `
      <tr>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: bold;">${s.rollNumber || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${s.barcode || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: bold;">${s.name || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${s.fatherName || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${s.motherName || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${s.aadhaarCard || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${s.gender || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${s.category || 'GEN'}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${s.stream || s.departmentName || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${s.subject || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${s.email || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${s.phone || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${s.address || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${s.semester || '1st Semester'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SAMS Student Database - Panchayat College, Baragada</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 10px;
              color: #111;
              margin: 0;
              padding: 10px;
            }
            h2 {
              text-align: center;
              margin-bottom: 4px;
              font-size: 16px;
            }
            p.subtitle {
              text-align: center;
              margin-top: 0;
              margin-bottom: 12px;
              font-size: 11px;
              color: #555;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 5px;
            }
            th {
              background-color: #78350f;
              color: white;
              border: 1px solid #572b0b;
              padding: 6px 4px;
              font-size: 9px;
              text-align: left;
            }
            td {
              font-size: 9px;
              color: #222;
            }
            tr:nth-child(even) {
              background-color: #fdfbf7;
            }
          </style>
        </head>
        <body>
          <h2>Panchayat College, Baragada - SAMS Student Database</h2>
          <p class="subtitle">Generated on ${new Date().toLocaleDateString()} | Total Records: ${filteredStudents.length}</p>
          <table>
            <thead>
              <tr>
                <th>Sl No</th>
                <th>Roll Number</th>
                <th>Barcode</th>
                <th>Applicant Name</th>
                <th>Father Name</th>
                <th>Mother Name</th>
                <th>Aadhaar</th>
                <th>Gender</th>
                <th>Category</th>
                <th>Stream</th>
                <th>Subject</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Address</th>
                <th>Semester</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 sm:p-12 border border-amber-200 dark:border-stone-800 shadow-xl text-center space-y-5 max-w-xl mx-auto my-12">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Admin Access Required
        </h3>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          The SAMS Student Database is strictly confidential and accessible only to verified <strong className="text-amber-800 dark:text-amber-400">Super Admin</strong> administrators. HODs and public visitors do not have access to general student records.
        </p>
        {onOpenLogin && (
          <button
            onClick={onOpenLogin}
            className="px-6 py-3 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all inline-flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Admin Log In</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-6 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 rounded-full text-xs font-bold mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>SAMS E-Admission Student Database</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 flex flex-wrap items-center gap-2">
            <span>Student Database</span>
            {isAuthorized ? (
              <span className="text-sm font-sans font-normal text-amber-800 dark:text-amber-400 bg-amber-100/70 dark:bg-stone-800 px-3 py-1 rounded-full">
                {filteredStudents.length} of {students.length} Records
              </span>
            ) : (
              <span className="text-xs font-sans font-semibold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-3 py-1 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Public View Restricted</span>
              </span>
            )}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Official SAMS student admission database for Panchayat College, Baragada. Sortable in dictionary order by Roll Number.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <button
              onClick={() => setActiveSubTab('sync-sams')}
              className={`px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 text-xs shadow-sm ${
                activeSubTab === 'sync-sams'
                  ? 'bg-amber-700 text-white ring-2 ring-amber-600/30'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-amber-300'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload SAMS File</span>
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              title="Admin Login to synchronize or edit student records"
              className="px-3.5 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-stone-200 dark:border-stone-700"
            >
              <Lock className="w-3.5 h-3.5 text-stone-400" />
              <span>Admin Sync Locked</span>
            </button>
          )}

          {isAuthorized ? (
            <div className="flex items-center gap-2">
              <button
                onClick={exportToExcel}
                className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 text-xs"
                title="Download all columns as Excel spreadsheet (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={exportToPDF}
                className="px-3.5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 text-xs"
                title="Download/Print PDF fitting all columns"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 text-xs"
            >
              <Lock className="w-4 h-4 text-amber-200" />
              <span>Log In to Access</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs Selector */}
      <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-900 p-1.5 rounded-2xl border border-stone-200 dark:border-stone-800 w-fit text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('directory')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'directory'
              ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
          }`}
        >
          <Database className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          <span>Student Directory ({students.length})</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveSubTab('sync-sams')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'sync-sams'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Upload SAMS Master File</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase rounded-full">
              Active
            </span>
          </button>
        )}
      </div>

      {/* --- SUB TAB 1: UPLOAD SAMS MASTER FILE --- */}
      {isAdmin && activeSubTab === 'sync-sams' && (
        <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-md space-y-6">
          
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div className="p-3 bg-emerald-100 dark:bg-stone-800 text-emerald-700 dark:text-emerald-400 rounded-2xl">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-stone-900 dark:text-stone-100">
                Synchronize SAMS Student Master Records
              </h3>
              <p className="text-xs text-stone-500">
                Upload your official SAMS master spreadsheet (.xlsx, .xls, or .csv). The portal extracts all student records, validates fields, deduplicates records strictly by Barcode Number, and preserves university roll number edits.
              </p>
            </div>
          </div>

          {/* Active SAMS Master Source Banner */}
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-stone-800/80 border border-amber-300 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 bg-amber-200 dark:bg-stone-700 text-amber-900 dark:text-amber-300 rounded-xl shrink-0 mt-0.5 sm:mt-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">Active Master Source:</span>
                  {syncSettings.savedFileName ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Saved SAMS File Active
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300/60">
                      Standard Master Database
                    </span>
                  )}
                </div>
                <p className="text-stone-600 dark:text-stone-300 text-xs mt-1">
                  {syncSettings.savedFileName ? (
                    <>Saved File: <strong className="text-stone-800 dark:text-stone-200">{syncSettings.savedFileName}</strong> ({syncSettings.fileStudentCount || students.length} students) {syncSettings.fileLastUploadedAt && `(Last uploaded: ${syncSettings.fileLastUploadedAt})`}</>
                  ) : (
                    `Current database contains ${students.length} student records. Upload an Excel file below to update records.`
                  )}
                </p>
              </div>
            </div>

            {/* Actions for currently active source */}
            <div className="shrink-0 flex items-center gap-2 flex-wrap">
              {syncSettings.savedFileName && syncSettings.savedFileStudents && syncSettings.savedFileStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleUpdateFromSavedFile}
                  disabled={isSyncing}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Reload students from the saved file"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Reload from Saved File</span>
                </button>
              )}

              {isAdmin && onDeleteAllStudents && (
                <button
                  type="button"
                  onClick={onDeleteAllStudents}
                  disabled={isSyncing || students.length === 0}
                  className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-red-200 dark:border-red-900/50 disabled:opacity-50"
                  title="Remove all student records to perform a clean re-import"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Bulk Cleanup (Delete All)</span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {syncStatus.type === 'success' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs sm:text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Sync Successful!</p>
                <p>{syncStatus.message}</p>
                {syncStatus.details && (
                  <p className="text-xs font-mono text-emerald-800 dark:text-emerald-300">{syncStatus.details}</p>
                )}
                <button
                  onClick={() => setActiveSubTab('directory')}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 underline"
                >
                  <span>View updated student directory now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {syncStatus.type === 'error' && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 rounded-2xl text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Sync Error</p>
                <p className="mt-0.5">{syncStatus.message}</p>
              </div>
            </div>
          )}

          {/* Direct Excel File Upload Area */}
          <div className="p-6 sm:p-8 bg-stone-50 dark:bg-stone-800/60 rounded-3xl border border-stone-200 dark:border-stone-700 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-base sm:text-lg">
                  Upload SAMS Excel File (.xlsx, .xls, .csv)
                </h4>
              </div>
              {syncSettings.savedFileName && (
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last Uploaded: {syncSettings.fileLastUploadedAt || 'Saved'}</span>
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              Upload your official SAMS master spreadsheet. The system automatically reads all student records, matches columns (Roll Number, Barcode, Applicant Name, Parents, Aadhaar, Stream, Subject, Mobile, Email, etc.), deduplicates records strictly by Barcode Number, and arranges students in dictionary order (A→Z).
            </p>

            {/* Saved File Info Card (if exists) */}
            {syncSettings.savedFileName && (
              <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-emerald-300 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        {syncSettings.savedFileName}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold uppercase rounded-full">
                        Active Master
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {syncSettings.fileStudentCount || 0} student records saved {syncSettings.savedFileSize ? `(${Math.round(syncSettings.savedFileSize / 1024)} KB)` : ''} • Uploaded on {syncSettings.fileLastUploadedAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUpdateFromSavedFile}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Reload from Saved File</span>
                  </button>
                </div>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Upload Button */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSyncing}
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 shadow-md disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Parsing & Synchronizing File...' : syncSettings.savedFileName ? 'Upload Newer SAMS File to Replace' : 'Choose Excel / CSV File (.xlsx, .xls, .csv)'}</span>
              </button>
            </div>
          </div>

          {/* SAMS Column Mapping Details Card */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-stone-800/60 border border-amber-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-300 space-y-2">
            <h4 className="font-bold text-amber-900 dark:text-amber-400 uppercase text-[11px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Column Detection & Validation Rules</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>• <strong>Applicant Name:</strong> Reads strictly from the applicant name column, stripping serial numbers.</div>
              <div>• <strong>Contact Info:</strong> Strict separation of Email ID and 10-digit Mobile Number (never confused with DOB or Religion).</div>
              <div>• <strong>AEDP Subjects:</strong> Professional AEDP courses are maintained as distinct subjects from traditional honours courses.</div>
              <div>• <strong>Dictionary Order:</strong> All student records are automatically arranged in alphabetical/lexicographical order by Roll Number (A→Z).</div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB TAB 2: STUDENT DIRECTORY TABLE --- */}
      {activeSubTab === 'directory' && (
        !isAuthorized ? (
          <div className="bg-gradient-to-b from-amber-50/90 via-orange-50/50 to-white dark:from-stone-800/80 dark:via-stone-900/80 dark:to-stone-900 border-2 border-dashed border-amber-300 dark:border-stone-700 rounded-3xl p-8 sm:p-14 text-center space-y-6 shadow-md">
            <div className="w-20 h-20 bg-amber-100 dark:bg-stone-700 text-amber-800 dark:text-amber-300 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-amber-300 dark:border-stone-600 transform -rotate-3 hover:rotate-0 transition-transform">
              <Lock className="w-10 h-10 text-amber-800 dark:text-amber-300" />
            </div>
            <div className="max-w-lg mx-auto space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-200/70 dark:bg-stone-700 text-amber-900 dark:text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                <span>Public Access Restricted</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
                Student Directory Restricted to Authorized Personnel
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                Public viewing of student personal records (Roll Numbers, Names, Aadhaar numbers, and Contact Details) is disabled to protect student privacy. Only verified Super Admin and Heads of Department (HODs) can view, filter, or export the student database upon authentication.
              </p>
            </div>
            {onOpenLogin && (
              <div className="pt-2">
                <button
                  onClick={onOpenLogin}
                  className="px-8 py-3.5 bg-gradient-to-r from-amber-800 via-amber-700 to-orange-800 hover:from-amber-900 hover:to-orange-900 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xl transition-all transform hover:-translate-y-0.5 inline-flex items-center gap-2.5"
                >
                  <Lock className="w-4 h-4 text-amber-200" />
                  <span>Log In as HOD or Portal Admin</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Category Tabs: (All, Regular, AEDP) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-100 dark:bg-stone-900 p-1.5 rounded-2xl border border-stone-200 dark:border-stone-800 w-fit text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedCourseType('ALL');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  selectedCourseType === 'ALL'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <span>All</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  selectedCourseType === 'ALL'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}>
                  {courseCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCourseType('REGULAR');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  selectedCourseType === 'REGULAR'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <span>Regular</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  selectedCourseType === 'REGULAR'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                }`}>
                  {courseCounts.regular}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCourseType('AEDP');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  selectedCourseType === 'AEDP'
                    ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 shadow-sm font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400'
                }`}
              >
                <span>AEDP</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  selectedCourseType === 'AEDP'
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                }`}>
                  {courseCounts.aedp}
                </span>
              </button>
            </div>
          </div>

          {/* Stream Tabs (All Streams, Arts, Commerce, Biological Science, Physical Science, Self Financing) */}
          <div className="flex flex-wrap items-center gap-2 bg-stone-100 dark:bg-stone-900 p-1.5 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs font-semibold overflow-x-auto">
            <span className="px-2 text-stone-500 font-bold uppercase text-[10px]">Streams:</span>
            {[
              { id: 'ALL', label: 'All Streams' },
              { id: 'Arts', label: 'Arts' },
              { id: 'Commerce', label: 'Commerce' },
              { id: 'Biological Science', label: 'Biological Science' },
              { id: 'Physical Science', label: 'Physical Science' },
              { id: 'Self Financing', label: 'Self Financing' }
            ].map((stTab) => {
              const count = streamCounts[stTab.id] || 0;
              const isActive = selectedStreamFilter === stTab.id;
              return (
                <button
                  key={stTab.id}
                  type="button"
                  onClick={() => {
                    setSelectedStreamFilter(stTab.id);
                    setSelectedSubjectFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-700 text-white shadow-sm font-bold'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <span>{stTab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-amber-800 text-white'
                      : 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-stone-900 p-4 sm:p-5 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Main Search Input */}
              <div className="md:col-span-4 relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-400">
                  <Search className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, roll no, barcode, mobile, category..."
                  className="w-full pl-11 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              {/* Stream Filter */}
              <div className="md:col-span-2">
                <select
                  value={selectedStreamFilter}
                  onChange={(e) => {
                    setSelectedStreamFilter(e.target.value);
                    setSelectedSubjectFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 font-medium"
                >
                  <option value="ALL">All Streams</option>
                  <option value="Arts">Arts</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Biological Science">Biological Science</option>
                  <option value="Physical Science">Physical Science</option>
                  <option value="Self Financing">Self Financing</option>
                </select>
              </div>

              {/* Subject Filter (Grouped by Stream) */}
              <div className="md:col-span-2">
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => {
                    setSelectedSubjectFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 font-medium truncate"
                >
                  <option value="ALL">All Subjects ({allUniqueSubjects.length})</option>
                  {selectedStreamFilter === 'ALL' ? (
                    <>
                      {Object.entries(streamSubjectsMap).map(([streamName, subs]) => (
                        subs.length > 0 && (
                          <optgroup key={streamName} label={`${streamName} Stream Subjects`}>
                            {subs.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </optgroup>
                        )
                      ))}
                      {aedpSubjects.length > 0 && (
                        <optgroup label="AEDP Specialized Courses">
                          {aedpSubjects.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  ) : (
                    <>
                      {(streamSubjectsMap[selectedStreamFilter] || []).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      {aedpSubjects.length > 0 && (
                        <optgroup label="AEDP Courses">
                          {aedpSubjects.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
              </div>

              {/* Category Filter (SC / ST / GEN / SEBC / OBC) */}
              <div className="md:col-span-2">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => {
                    setSelectedCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 font-medium"
                >
                  <option value="ALL">All Categories</option>
                  <option value="GEN">GEN (General)</option>
                  <option value="SC">SC (Scheduled Caste)</option>
                  <option value="ST">ST (Scheduled Tribe)</option>
                  <option value="SEBC">SEBC</option>
                  <option value="OBC">OBC</option>
                </select>
              </div>

              {/* Course Type Filter (All, Regular, AEDP) */}
              <div className="md:col-span-2">
                <select
                  value={selectedCourseType}
                  onChange={(e) => {
                    setSelectedCourseType(e.target.value as 'ALL' | 'REGULAR' | 'AEDP');
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 font-medium"
                >
                  <option value="ALL">Type ({courseCounts.all})</option>
                  <option value="REGULAR">Regular ({courseCounts.regular})</option>
                  <option value="AEDP">AEDP ({courseCounts.aedp})</option>
                </select>
              </div>
            </div>

            {/* Quick Reset & Status Ticker */}
            <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800">
              <span className="flex items-center gap-1.5">
                <span>Showing {filteredStudents.length} matching students</span>
                <span className="text-[10px] bg-amber-100 dark:bg-stone-800 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                  Sorted: Roll No (Dictionary Order A→Z)
                </span>
                {selectedCourseType !== 'ALL' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedCourseType === 'AEDP' 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-stone-800 dark:text-amber-300'
                  }`}>
                    {selectedCourseType === 'AEDP' ? 'AEDP Only' : 'Regular Only'}
                  </span>
                )}
              </span>
              {(searchTerm || selectedStreamFilter !== 'ALL' || selectedSubjectFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || selectedCourseType !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedStreamFilter('ALL');
                    setSelectedSubjectFilter('ALL');
                    setSelectedCategoryFilter('ALL');
                    setSelectedCourseType('ALL');
                    setCurrentPage(1);
                  }}
                  className="text-amber-800 dark:text-amber-400 font-semibold hover:underline"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </div>

          {/* Students Table */}
          <style>{`
            @media print {
              @page {
                size: A4 landscape;
                margin: 6mm;
              }
              body * {
                visibility: hidden;
              }
              #printable-student-table, #printable-student-table * {
                visibility: visible;
              }
              #printable-student-table {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}</style>
          <div id="printable-student-table" className="bg-white dark:bg-stone-900 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-amber-50/90 dark:bg-stone-800/90 border-b border-amber-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 uppercase text-[11px] font-bold tracking-wider">
                    <th className="py-3.5 px-4">
                      <span className="flex items-center gap-1.5">
                        Roll No 
                        <span className="text-[9px] bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 px-1.5 py-0.5 rounded font-mono font-bold tracking-normal">
                          A→Z
                        </span>
                      </span>
                    </th>
                    <th className="py-3.5 px-4">Barcode</th>
                    <th className="py-3.5 px-4">Applicant Name</th>
                    <th className="py-3.5 px-4">Father & Mother Name</th>
                    <th className="py-3.5 px-4">Aadhaar Card (UID)</th>
                    <th className="py-3.5 px-3 text-center">Gender</th>
                    <th className="py-3.5 px-3 text-center">Category</th>
                    <th className="py-3.5 px-4">Department / Stream</th>
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4">Contact Info (Mail, Phone & Address)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
                  {currentStudents.length > 0 ? (
                    currentStudents.map((s) => {
                      const isAedp = s.subject && s.subject.includes('AEDP');
                      const parentDisplayName = s.parentsName || (s.fatherName ? `F: ${s.fatherName}${s.motherName ? ` / M: ${s.motherName}` : ''}` : 'N/A');
                      const cleanPhoneDigits = (s.phone || '').replace(/[^0-9]/g, '');

                      return (
                        <tr key={s.id} className="hover:bg-amber-50/50 dark:hover:bg-stone-800/50 transition-colors">
                          {/* Roll No */}
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-900 dark:text-amber-400 whitespace-nowrap">
                            {s.rollNumber}
                          </td>

                          {/* Barcode */}
                          <td className="py-3.5 px-4 font-mono text-stone-600 dark:text-stone-300 whitespace-nowrap">
                            <span className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                              {s.barcode}
                            </span>
                          </td>

                          {/* Applicant Name */}
                          <td className="py-3.5 px-4 font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                s.gender === 'Female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              }`}>
                                {s.name ? s.name[0] : 'U'}
                              </div>
                              <span>{s.name}</span>
                            </div>
                          </td>

                          {/* Father & Mother Name */}
                          <td className="py-3.5 px-4 text-xs font-medium text-stone-700 dark:text-stone-300 max-w-xs truncate">
                            <span title={parentDisplayName}>{parentDisplayName}</span>
                          </td>

                          {/* Aadhaar Card Number */}
                          <td className="py-3.5 px-4 text-xs font-mono text-stone-700 dark:text-stone-300 whitespace-nowrap">
                            <span className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700 font-bold text-stone-700 dark:text-stone-200">
                              {s.aadhaarCard || 'N/A'}
                            </span>
                          </td>

                          {/* Gender */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              s.gender === 'Female'
                                ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              {s.gender}
                            </span>
                          </td>

                          {/* Category (SC/ST/GEN/SEBC/OBC) */}
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono ${
                              (s.category || 'GEN') === 'ST'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : (s.category || 'GEN') === 'SC'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : (s.category || 'GEN') === 'SEBC'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                                : (s.category || 'GEN') === 'OBC'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                            }`}>
                              {s.category || 'GEN'}
                            </span>
                          </td>

                          {/* Department / Stream */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-medium text-stone-600 dark:text-stone-300">
                            {s.stream || s.departmentName}
                          </td>

                          {/* Subject Name with AEDP distinction */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-stone-800 dark:text-stone-200">
                                {s.subject}
                              </span>
                              {isAedp && (
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-bold uppercase rounded">
                                  AEDP
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Contact Info: Interactive Email ID, Mobile Number & Address */}
                          <td className="py-3.5 px-4 space-y-1.5 text-xs text-stone-600 dark:text-stone-300 min-w-[240px]">
                            {/* Interactive Mail Link */}
                            <p className="flex items-center gap-1.5 font-sans whitespace-nowrap">
                              <a
                                href={s.email ? `mailto:${s.email}` : '#'}
                                className="inline-flex items-center gap-1.5 hover:text-amber-700 dark:hover:text-amber-400 hover:underline transition-colors"
                                title={s.email ? `Send email to ${s.email}` : undefined}
                              >
                                <Mail className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                                <span>{s.email}</span>
                              </a>
                            </p>

                            {/* Interactive Phone Number with Call, WhatsApp, and Copy */}
                            <div className="flex items-center justify-between gap-2 font-mono whitespace-nowrap">
                              <a
                                href={cleanPhoneDigits ? `tel:${cleanPhoneDigits}` : '#'}
                                className="inline-flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200 hover:text-amber-700 dark:hover:text-amber-400 hover:underline transition-colors group"
                                title={`Click to call ${s.phone}`}
                              >
                                <Phone className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                                <span>{s.phone}</span>
                              </a>

                              {/* Quick Action Badge Bar */}
                              <div className="inline-flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800/80 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
                                {/* Direct Call Action */}
                                {cleanPhoneDigits && (
                                  <a
                                    href={`tel:${cleanPhoneDigits}`}
                                    title={`Direct Call ${s.phone}`}
                                    className="p-1 rounded text-amber-800 dark:text-amber-300 hover:bg-amber-200/80 dark:hover:bg-amber-900/60 transition-colors"
                                  >
                                    <PhoneCall className="w-3 h-3" />
                                  </a>
                                )}

                                {/* WhatsApp Action */}
                                {cleanPhoneDigits.length >= 10 && (
                                  <a
                                    href={`https://wa.me/91${cleanPhoneDigits.slice(-10)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`Message ${s.name} on WhatsApp`}
                                    className="p-1 rounded text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </a>
                                )}

                                {/* Copy Phone Number */}
                                <button
                                  onClick={() => handleCopy(s.phone, `phone-${s.id}`)}
                                  title="Copy phone number"
                                  className="p-1 rounded text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                                >
                                  {copiedId === `phone-${s.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 font-bold" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Address */}
                            <p className="flex items-start gap-1.5 font-sans text-[11px] text-stone-600 dark:text-stone-400 leading-tight">
                              <MapPin className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                              <span className="truncate max-w-[220px]" title={s.address || 'At/Po: Bargarh, Dist: Bargarh, Odisha'}>
                                {s.address || 'At/Po: Bargarh, Dist: Bargarh, Odisha'}
                              </span>
                            </p>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-stone-500 dark:text-stone-400">
                        No student records found matching the specified filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="p-4 bg-stone-50 dark:bg-stone-800/60 border-t border-stone-200 dark:border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-600 dark:text-stone-300">
              <div>
                Showing <span className="font-semibold">{Math.min(filteredStudents.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
                <span className="font-semibold">{Math.min(filteredStudents.length, currentPage * pageSize)}</span> of{' '}
                <span className="font-semibold">{filteredStudents.length}</span> students
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
        )
      )}

    </div>
  );
};
