import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  FileText,
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RotateCcw, 
  Send, 
  Download, 
  Printer, 
  Search, 
  Users, 
  Award, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Trash2, 
  Check, 
  X, 
  RefreshCw,
  Building2,
  Calendar,
  Lock,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Department, Application, Student } from '../types';
import { 
  SpotWaitingStudent, 
  SpotPublishedResult, 
  getSpotWaitingStudents, 
  saveSpotWaitingStudents, 
  getSpotPublishedResult, 
  saveSpotPublishedResult, 
  parseSpotExcelWorkbook, 
  computeSelectionResults,
  getSpotCustomVacancies,
  saveSpotCustomVacancies
} from '../utils/spotRoundService';
import { getSubjectVacancyFromSeatMatrix } from '../utils/sanctionedSeatsService';
import { generateSpotOfficialPdf, printSpotOfficialListWindow } from '../utils/pdfGenerator';
import { generateSpotOfficialWord } from '../utils/wordGenerator';
import { db, doc, onSnapshot } from '../firebase';

interface SpotRoundViewProps {
  departments: Department[];
  applications?: Application[];
  onAddApplication?: (app: Omit<Application, 'id' | 'applicationNumber' | 'createdAt'>) => void;
  userRole?: 'admin' | 'hod' | 'student' | null;
  isSpotRoundEnabled?: boolean;
  onToggleSpotRound?: (enabled: boolean) => void;
  students?: Student[];
  sanctionedSeatsMap?: Record<string, number>;
}

export const SpotRoundView: React.FC<SpotRoundViewProps> = ({ 
  departments, 
  userRole = null,
  isSpotRoundEnabled = true,
  onToggleSpotRound,
  students = [],
  sanctionedSeatsMap
}) => {
  const isAdmin = userRole === 'admin';

  // Navigation tab within Spot Round
  // Admin: 'waiting-list' | 'live-spot' | 'published-result'
  // Public/HOD: 'live-spot' (if enabled) | 'published-result'
  const [activeSubTab, setActiveSubTab] = useState<'waiting-list' | 'live-spot' | 'published-result'>(
    isAdmin ? 'waiting-list' : (isSpotRoundEnabled ? 'live-spot' : 'published-result')
  );

  // State
  const [waitingStudents, setWaitingStudents] = useState<SpotWaitingStudent[]>([]);
  const [publishedResult, setPublishedResult] = useState<SpotPublishedResult | null>(null);
  const [customVacancies, setCustomVacancies] = useState<Record<string, number>>({});
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter & Search states
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedReportingFilter, setSelectedReportingFilter] = useState<'ALL' | 'REPORTED' | 'NOT_REPORTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Upload section collapse/expand small tab state
  const [isUploadCardExpanded, setIsUploadCardExpanded] = useState<boolean>(true);
  const [uploadImportMode, setUploadImportMode] = useState<'merge' | 'replace'>('merge');

  // Confirmation modals
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPublishSuccessAlert, setShowPublishSuccessAlert] = useState(false);

  // Load persisted data on mount & subscribe to real-time Firestore updates across all devices
  useEffect(() => {
    const loadedStudents = getSpotWaitingStudents();
    const loadedPublished = getSpotPublishedResult();
    const loadedVacancies = getSpotCustomVacancies();

    setWaitingStudents(loadedStudents);
    setPublishedResult(loadedPublished);
    setCustomVacancies(loadedVacancies);

    // 1. Real-time Firestore snapshot listeners across all devices
    const unsubWaiting = onSnapshot(doc(db, 'systemSettings', 'spotWaitingStudents'), (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.list) && data.list.length > 0) {
          setWaitingStudents(data.list);
          localStorage.setItem('SAMS_SPOT_WAITING_STUDENTS', JSON.stringify(data.list));
        }
      }
    }, () => {});

    const unsubPublished = onSnapshot(doc(db, 'systemSettings', 'spotPublishedResult'), (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        setPublishedResult(data.result || null);
        if (data.result === null) {
          localStorage.removeItem('SAMS_SPOT_PUBLISHED_RESULTS');
        } else {
          localStorage.setItem('SAMS_SPOT_PUBLISHED_RESULTS', JSON.stringify(data.result));
        }
      }
    }, () => {});

    const unsubVacancies = onSnapshot(doc(db, 'systemSettings', 'spotCustomVacancies'), (snap: any) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.vacancies) {
          setCustomVacancies(data.vacancies);
          localStorage.setItem('SAMS_SPOT_CUSTOM_VACANCIES', JSON.stringify(data.vacancies));
        }
      }
    }, () => {});

    // 2. BroadcastChannel cross-tab listener
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('sams_spot_round_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'SPOT_WAITING_STUDENTS_UPDATED' && Array.isArray(event.data.list)) {
            setWaitingStudents(event.data.list);
          } else if (event.data?.type === 'SPOT_PUBLISHED_RESULT_UPDATED') {
            setPublishedResult(event.data.result || null);
          } else if (event.data?.type === 'SPOT_CUSTOM_VACANCIES_UPDATED' && event.data.vacancies) {
            setCustomVacancies(event.data.vacancies);
          }
        };
      } catch (_) {}
    }

    // If non-admin, redirect from admin-only 'waiting-list' tab
    if (!isAdmin && activeSubTab === 'waiting-list') {
      setActiveSubTab(isSpotRoundEnabled ? 'live-spot' : 'published-result');
    }

    return () => {
      unsubWaiting();
      unsubPublished();
      unsubVacancies();
      if (channel) channel.close();
    };
  }, [isAdmin, isSpotRoundEnabled]);

  // Sync department names directly from 'upload and waiting list pool' (as given in 'major subjects')
  const waitingPoolDepartments = useMemo(() => {
    const set = new Set<string>();
    waitingStudents.forEach(s => {
      const d = s.departmentName?.trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [waitingStudents]);

  // Synchronize department vacancy details directly from Subjects & Seat Matrix
  const departmentSeatMatrixInfo = useMemo(() => {
    const infoMap: Record<string, {
      vacancy: number;
      sanctionedStrength: number;
      admittedCount: number;
      matchedCode?: string;
      matchedName?: string;
    }> = {};

    waitingPoolDepartments.forEach(dept => {
      infoMap[dept] = getSubjectVacancyFromSeatMatrix(dept, students, sanctionedSeatsMap);
    });

    return infoMap;
  }, [waitingPoolDepartments, students, sanctionedSeatsMap]);

  // Effective Department Vacancy Map
  // Automatically synchronized from Subjects & Seat Matrix (with optional admin override support)
  const departmentVacancyMap = useMemo(() => {
    const map: Record<string, number> = {};

    waitingPoolDepartments.forEach(dept => {
      if (customVacancies[dept] !== undefined) {
        map[dept] = customVacancies[dept];
      } else {
        // Direct sync from Subjects & Seat Matrix
        map[dept] = departmentSeatMatrixInfo[dept]?.vacancy ?? 0;
      }
    });

    return map;
  }, [waitingPoolDepartments, customVacancies, departmentSeatMatrixInfo]);

  // Re-sync all department vacancies from Subjects & Seat Matrix
  const handleResyncAllFromSeatMatrix = () => {
    setCustomVacancies({});
    saveSpotCustomVacancies({});
    setUploadFeedback({
      type: 'success',
      message: 'Successfully re-synchronized all Department Spot Vacancies directly from Subjects & Seat Matrix.'
    });
  };

  // Helper to update waiting students and keep published result in sync live across all tabs
  const updateAndSaveWaitingStudents = (newList: SpotWaitingStudent[]) => {
    setWaitingStudents(newList);
    saveSpotWaitingStudents(newList);

    if (publishedResult) {
      const updatedPublished = computeSelectionResults(
        newList,
        departmentVacancyMap,
        publishedResult.publishedBy || 'Admin / Principal Office'
      );
      setPublishedResult(updatedPublished);
      saveSpotPublishedResult(updatedPublished);
    }
  };

  // Handler for Excel file uploads (supports one or multiple sheets)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadFeedback(null);

    try {
      let currentList = uploadImportMode === 'replace' ? [] : [...waitingStudents];
      let totalNew = 0;
      let totalUpdated = 0;
      const fileNames: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        fileNames.push(file.name);
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const parseRes = parseSpotExcelWorkbook(workbook, file.name, currentList);
        currentList = parseRes.students;
        totalNew += parseRes.newCount;
        totalUpdated += parseRes.updatedCount;
      }

      updateAndSaveWaitingStudents(currentList);

      setUploadFeedback({
        type: 'success',
        message: `Successfully processed ${files.length} file(s) [${fileNames.join(', ')}]. Added ${totalNew} new waiting list applicants and updated ${totalUpdated} records. Total waiting list pool: ${currentList.length} students.`
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Error parsing spot round Excel sheet:', err);
      setUploadFeedback({
        type: 'error',
        message: `Failed to parse Excel file: ${err?.message || 'Invalid format'}. Please ensure the file has columns like Roll No, Barcode/Application ID, Name, Department/Subject, Marks/Percentage.`
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle reported status for a single student
  const handleToggleReported = (studentId: string, reportedStatus: boolean) => {
    const updated = waitingStudents.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          reported: reportedStatus,
          reportedAt: reportedStatus ? new Date().toISOString() : undefined
        };
      }
      return s;
    });

    updateAndSaveWaitingStudents(updated);
  };

  // Bulk set reported status for currently filtered list
  const handleBulkSetReported = (status: boolean) => {
    const filteredIds = new Set(filteredWaitingStudents.map(s => s.id));
    const updated = waitingStudents.map(s => {
      if (filteredIds.has(s.id)) {
        return {
          ...s,
          reported: status,
          reportedAt: status ? new Date().toISOString() : undefined
        };
      }
      return s;
    });

    updateAndSaveWaitingStudents(updated);
  };

  // Handle printing official list (opens dedicated window formatted 1 department per page)
  const handlePrintOfficialList = () => {
    const res = publishedResult || computeSelectionResults(waitingStudents, departmentVacancyMap, 'Admin / Principal Office');
    if (res && res.departments.length > 0) {
      printSpotOfficialListWindow(res);
    } else {
      setSelectedDeptFilter('ALL');
      setSearchTerm('');
      setTimeout(() => {
        window.print();
      }, 200);
    }
  };

  // Handle generating and downloading vector PDF file (1 department per page)
  const handleDownloadOfficialPdf = () => {
    const res = publishedResult || computeSelectionResults(waitingStudents, departmentVacancyMap, 'Admin / Principal Office');
    if (res && res.departments.length > 0) {
      generateSpotOfficialPdf(res);
    } else {
      alert('No candidate or department data available to generate PDF.');
    }
  };

  // Handle generating and downloading official Word document (.doc / .docx)
  const handleDownloadOfficialWord = () => {
    const res = publishedResult || computeSelectionResults(waitingStudents, departmentVacancyMap, 'Admin / Principal Office');
    if (res && res.departments.length > 0) {
      generateSpotOfficialWord(res);
    } else {
      alert('No candidate or department data available to generate Word document.');
    }
  };

  // Clear all waiting list records (Admin only)
  const handleClearAllWaitingStudents = () => {
    setWaitingStudents([]);
    saveSpotWaitingStudents([]);
    setPublishedResult(null);
    saveSpotPublishedResult(null);
    setShowClearConfirm(false);
    setUploadFeedback({
      type: 'success',
      message: 'All spot round waiting list applicants cleared from database.'
    });
  };

  // Update custom vacancy count for a department
  const handleUpdateDeptVacancy = (deptName: string, vacancy: number) => {
    const updatedVacancies = { ...customVacancies, [deptName]: Math.max(0, vacancy) };
    setCustomVacancies(updatedVacancies);
    saveSpotCustomVacancies(updatedVacancies);

    if (publishedResult) {
      const updatedMap = { ...departmentVacancyMap, [deptName]: Math.max(0, vacancy) };
      const updatedPublished = computeSelectionResults(
        waitingStudents,
        updatedMap,
        publishedResult.publishedBy || 'Admin / Principal Office'
      );
      setPublishedResult(updatedPublished);
      saveSpotPublishedResult(updatedPublished);
    }
  };

  // Publish Results handler
  const handlePublishResults = () => {
    const result = computeSelectionResults(
      waitingStudents,
      departmentVacancyMap,
      'Admin / Principal Office'
    );

    setPublishedResult(result);
    saveSpotPublishedResult(result);
    setShowPublishSuccessAlert(true);
    setActiveSubTab('published-result');

    setTimeout(() => {
      setShowPublishSuccessAlert(false);
    }, 6000);
  };

  // Unpublish Results handler
  const handleUnpublishResults = () => {
    if (window.confirm('Are you sure you want to unpublish the current Spot Round selection? This will withdraw the public list until re-published.')) {
      setPublishedResult(null);
      saveSpotPublishedResult(null);
    }
  };

  // Filtered waiting list students
  const filteredWaitingStudents = useMemo(() => {
    return waitingStudents.filter(s => {
      // Dept filter
      if (selectedDeptFilter !== 'ALL' && s.departmentName !== selectedDeptFilter) {
        return false;
      }
      // Reporting filter
      if (selectedReportingFilter === 'REPORTED' && !s.reported) return false;
      if (selectedReportingFilter === 'NOT_REPORTED' && s.reported) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches = 
          (s.name && s.name.toLowerCase().includes(term)) ||
          (s.barcode && s.barcode.toLowerCase().includes(term)) ||
          (s.rollNumber && s.rollNumber.toLowerCase().includes(term)) ||
          (s.departmentName && s.departmentName.toLowerCase().includes(term)) ||
          (s.category && s.category.toLowerCase().includes(term)) ||
          (s.phone && s.phone.includes(term));
        if (!matches) return false;
      }

      return true;
    });
  }, [waitingStudents, selectedDeptFilter, selectedReportingFilter, searchTerm]);

  // Live Spot Applications (All students where reported === true)
  const liveSpotApplications = useMemo(() => {
    return waitingStudents.filter(s => s.reported);
  }, [waitingStudents]);

  const filteredLiveSpotApplications = useMemo(() => {
    const list = liveSpotApplications.filter(s => {
      if (selectedDeptFilter !== 'ALL' && s.departmentName !== selectedDeptFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          (s.name && s.name.toLowerCase().includes(term)) ||
          (s.barcode && s.barcode.toLowerCase().includes(term)) ||
          (s.rollNumber && s.rollNumber.toLowerCase().includes(term)) ||
          (s.departmentName && s.departmentName.toLowerCase().includes(term)) ||
          (s.category && s.category.toLowerCase().includes(term))
        );
      }
      return true;
    });

    // Sort students in descending order according to percentage
    return list.sort((a, b) => {
      const getPercentage = (st: SpotWaitingStudent): number => {
        if (st.percentage !== undefined && !isNaN(st.percentage)) return st.percentage;
        if (st.securedMark !== undefined && st.maxMark !== undefined && st.maxMark > 0) {
          return (st.securedMark / st.maxMark) * 100;
        }
        if (st.mark !== undefined && !isNaN(st.mark)) {
          return st.mark <= 100 ? st.mark : (st.mark / 600) * 100;
        }
        return 0;
      };

      const aPct = getPercentage(a);
      const bPct = getPercentage(b);

      if (bPct !== aPct) {
        return bPct - aPct; // Descending order
      }

      // Tie-breaker: secured mark descending
      const aSec = a.securedMark ?? a.mark ?? 0;
      const bSec = b.securedMark ?? b.mark ?? 0;
      if (bSec !== aSec) {
        return bSec - aSec;
      }

      // Tie-breaker: waiting rank ascending
      const aRank = typeof a.waitingRank === 'number' ? a.waitingRank : (typeof a.rank === 'number' ? a.rank : 99999);
      const bRank = typeof b.waitingRank === 'number' ? b.waitingRank : (typeof b.rank === 'number' ? b.rank : 99999);
      if (aRank !== bRank) {
        return aRank - bRank;
      }

      return (a.name || '').localeCompare(b.name || '');
    });
  }, [liveSpotApplications, selectedDeptFilter, searchTerm]);

  // Department counts for summary
  const summaryStats = useMemo(() => {
    const total = waitingStudents.length;
    const reported = liveSpotApplications.length;
    const notReported = total - reported;

    const deptReportedCounts: Record<string, number> = {};
    liveSpotApplications.forEach(s => {
      const dept = s.departmentName || 'General';
      deptReportedCounts[dept] = (deptReportedCounts[dept] || 0) + 1;
    });

    return { total, reported, notReported, deptReportedCounts };
  }, [waitingStudents, liveSpotApplications]);

  // Export to CSV helper
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...data.map(row => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Live Reported Applicants
  const handleExportLiveReported = () => {
    const headers = [
      'Sl', 
      'Waiting Rank', 
      'Barcode / App No', 
      'Roll Number', 
      'Applicant Name', 
      'Department', 
      'Category', 
      'Maximum Mark', 
      'Secure Mark', 
      'Percentage (%)'
    ];
    const rows = filteredLiveSpotApplications.map((s, idx) => {
      const maxM = s.maxMark ?? (s.securedMark && s.percentage ? Math.round((s.securedMark / s.percentage) * 100) : (s.mark && s.mark > 100 ? 600 : ''));
      const secM = s.securedMark ?? s.mark ?? '';
      const pct = s.percentage !== undefined ? `${s.percentage.toFixed(2)}%` : 
                  (s.securedMark && s.maxMark ? `${((s.securedMark / s.maxMark) * 100).toFixed(2)}%` : '');
      return [
        idx + 1,
        `"${s.waitingRank ?? s.rank ?? (idx + 1)}"`,
        `"${s.barcode || ''}"`,
        `"${s.rollNumber || ''}"`,
        `"${s.name || ''}"`,
        `"${s.departmentName || ''}"`,
        `"${s.category || 'GEN'}"`,
        maxM,
        secM,
        `"${pct}"`
      ];
    });
    exportToCSV(rows, 'Live_Spot_Reported_Applicants', headers);
  };

  // Export Published Merit List
  const handleExportPublishedResult = () => {
    if (!publishedResult) return;
    const headers = ['Department', 'Allotment Status', 'Rank', 'Barcode', 'Roll No', 'Applicant Name', 'Category', 'Merit % / Mark'];
    const rows: any[] = [];

    publishedResult.departments.forEach(dept => {
      if (selectedDeptFilter !== 'ALL' && dept.deptName !== selectedDeptFilter) return;

      dept.selectedStudents.forEach(s => {
        rows.push([
          `"${dept.deptName}"`,
          '"Provisionally Selected"',
          s.selectionRank,
          `"${s.barcode || ''}"`,
          `"${s.rollNumber || ''}"`,
          `"${s.name || ''}"`,
          `"${s.category || 'GEN'}"`,
          s.percentage ?? s.mark ?? ''
        ]);
      });

      dept.waitingStudents.forEach(s => {
        rows.push([
          `"${dept.deptName}"`,
          '"Waiting List"',
          `"WL #${s.waitingRank}"`,
          `"${s.barcode || ''}"`,
          `"${s.rollNumber || ''}"`,
          `"${s.name || ''}"`,
          `"${s.category || 'GEN'}"`,
          s.percentage ?? s.mark ?? ''
        ]);
      });
    });

    exportToCSV(rows, 'Spot_Round_Provisionally_Selected_And_Waiting_List', headers);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Super Admin Control Bar for public visibility toggle */}
      {isAdmin && onToggleSpotRound && (
        <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm transition-all ${
          isSpotRoundEnabled
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-100'
            : 'bg-amber-50 border-amber-300 text-amber-950 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-100'
        }`}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-700 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-sm">Super Admin Spot Round Tab Control</p>
              <p className="text-xs opacity-90">
                {isSpotRoundEnabled
                  ? 'Spot Round Seats tab is currently ENABLED and visible in the public navigation.'
                  : 'Spot Round Seats tab is currently DISABLED for public & HOD view.'
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => onToggleSpotRound(!isSpotRoundEnabled)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 ${
              isSpotRoundEnabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            {isSpotRoundEnabled ? 'Disable Tab for Public/HOD' : 'Enable Tab for Public/HOD'}
          </button>
        </div>
      )}

      {/* Spot Round Hero Header */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/30 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-amber-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Spot e-Admission Desk • Session 2026</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-extrabold tracking-tight">
            Spot Round Admissions & Merit Allotment
          </h2>
          <p className="text-amber-100 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Spot round candidates are registered, tracked through physical/online reporting, and ranked strictly by merit against available department vacancies.
          </p>

          {/* Quick Counter Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-amber-300" />
              <span>Reported Candidates: <strong className="text-emerald-300">{summaryStats.reported}</strong></span>
            </div>
            {publishedResult && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Result Published: <strong className="text-white">{publishedResult.totalSelected} Selected</strong>, <strong className="text-white">{publishedResult.totalWaiting} on Waiting List</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Banner when Results are published */}
      {showPublishSuccessAlert && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-900 dark:text-emerald-100 flex items-center justify-between gap-4 animate-fade-in shadow-md">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-sm">Results Successfully Published!</p>
              <p className="text-xs">
                Top students across all departments have been provisionally selected based on vacancy, and remaining candidates are placed on the waiting list.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowPublishSuccessAlert(false)}
            className="p-1 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-3">
        <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-900 p-1.5 rounded-2xl border border-stone-200 dark:border-stone-800 text-xs font-semibold">
          {/* Admin Only Tab: Upload & Waiting List */}
          {isAdmin && (
            <button
              onClick={() => setActiveSubTab('waiting-list')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
                activeSubTab === 'waiting-list'
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload & Waiting List Pool</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                {summaryStats.total}
              </span>
            </button>
          )}

          {/* Public & Admin Tab: Live Spot Applications (Shown when Spot Round Seats is enabled or for Admin) */}
          {(isAdmin || isSpotRoundEnabled) && (
            <button
              onClick={() => setActiveSubTab('live-spot')}
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
                activeSubTab === 'live-spot'
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Live Spot Applications</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                {summaryStats.reported}
              </span>
            </button>
          )}

          {/* Public & Admin Tab: Provisionally Selected & Waiting List */}
          <button
            onClick={() => setActiveSubTab('published-result')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
              activeSubTab === 'published-result'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Provisionally Selected & Waiting List</span>
            {publishedResult && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Admin Quick Notification Badge */}
        {isAdmin && (
          <div className="text-xs font-semibold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Uploads & Reported Status are Private to Admin</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: UPLOAD & WAITING LIST STUDENTS (ADMIN ONLY)                        */}
      {/* ========================================================================= */}
      {isAdmin && activeSubTab === 'waiting-list' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Excel Upload Section (Small Tab Container) */}
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm transition-all overflow-hidden">
            {/* Small Tab Header Bar */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/30 dark:from-stone-900 dark:via-stone-900 dark:to-stone-850 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setIsUploadCardExpanded(!isUploadCardExpanded)}>
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
                      Upload Waiting List Excel Sheets
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                      {waitingStudents.length} Candidates in Pool
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Upload one or more Excel (.xlsx, .xls) or CSV files. Auto-syncs department names from Major Subject.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <label 
                  htmlFor="spot-excel-upload" 
                  className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Processing...' : '+ Upload Excel'}</span>
                </label>

                {waitingStudents.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900 flex items-center gap-1 transition-colors"
                    title="Clear all waiting list applicants"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Clear Pool</span>
                  </button>
                )}

                <button
                  onClick={() => setIsUploadCardExpanded(!isUploadCardExpanded)}
                  className="p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
                  title={isUploadCardExpanded ? 'Collapse Tab' : 'Expand Tab'}
                >
                  {isUploadCardExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Expandable Tab Content */}
            {isUploadCardExpanded && (
              <div className="p-6 sm:p-8 space-y-6 animate-fade-in">
                
                {/* Upload Mode Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-amber-50/50 dark:bg-stone-850 rounded-2xl border border-amber-200/60 dark:border-stone-800 text-xs">
                  <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                    <span>Import Mode:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadImportMode('merge')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                        uploadImportMode === 'merge'
                          ? 'bg-amber-700 text-white shadow-sm'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <span>Merge & Update Existing Pool</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadImportMode('replace')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                        uploadImportMode === 'replace'
                          ? 'bg-red-700 text-white shadow-sm'
                          : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <span>Fresh Import (Replace Pool)</span>
                    </button>
                  </div>
                </div>

                {/* Drag & Drop Upload Zone */}
                <div className="p-8 border-2 border-dashed border-amber-300 dark:border-stone-700 hover:border-amber-500 rounded-3xl bg-amber-50/30 dark:bg-stone-850 text-center transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                    id="spot-excel-upload"
                  />
                  <label 
                    htmlFor="spot-excel-upload" 
                    className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shadow-inner">
                      {isUploading ? (
                        <RefreshCw className="w-7 h-7 animate-spin" />
                      ) : (
                        <Upload className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
                        {isUploading ? 'Parsing & Updating Excel Sheet(s)...' : 'Click to Upload One or More Excel / CSV Sheets'}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        Supports multiple files (.xlsx, .xls, .csv). Auto-detects Barcode, Roll No, Name, Major Subject, Marks, %, Waiting Rank.
                      </p>
                    </div>
                    <span className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition-all">
                      Browse Files
                    </span>
                  </label>
                </div>

                {/* Feedback Message */}
                {uploadFeedback && (
                  <div className={`p-4 rounded-2xl text-xs sm:text-sm flex items-start gap-3 ${
                    uploadFeedback.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-100'
                      : 'bg-red-50 border border-red-300 text-red-900 dark:bg-red-950/50 dark:border-red-800 dark:text-red-100'
                  }`}>
                    {uploadFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-grow">
                      <p className="font-semibold">{uploadFeedback.message}</p>
                    </div>
                    <button onClick={() => setUploadFeedback(null)} className="p-1 hover:opacity-70">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Department-Wise Waiting List Students with Reported / Not Reported Tabs */}
          <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-6">
            
            {/* Header Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-700" />
                  <span>Department-Wise Waiting List Applicants</span>
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Mark each candidate as Reported or Not Reported as they report at the college spot counter.
                </p>
              </div>

              {/* Quick Bulk Actions */}
              {filteredWaitingStudents.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => handleBulkSetReported(true)}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl font-semibold border border-emerald-300 dark:border-emerald-800 transition-colors"
                  >
                    Mark All Filtered Reported
                  </button>
                  <button
                    onClick={() => handleBulkSetReported(false)}
                    className="px-3 py-1.5 bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 hover:bg-stone-200 rounded-xl font-semibold border border-stone-300 dark:border-stone-700 transition-colors"
                  >
                    Mark All Filtered Not Reported
                  </button>
                </div>
              )}
            </div>

            {/* Filter Bar: Department Filter, Reporting Filter, Search */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Department Dropdown */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Department / Major Subject
                </label>
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200"
                >
                  <option value="ALL">All Major Subjects / Departments ({waitingStudents.length})</option>
                  {waitingPoolDepartments.map(dept => {
                    const count = waitingStudents.filter(s => s.departmentName === dept).length;
                    return (
                      <option key={dept} value={dept}>
                        {dept} ({count} applicants)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Reporting Status Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Reporting Status
                </label>
                <select
                  value={selectedReportingFilter}
                  onChange={(e) => setSelectedReportingFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200"
                >
                  <option value="ALL">All Applicants ({waitingStudents.length})</option>
                  <option value="REPORTED">Reported Only ({summaryStats.reported})</option>
                  <option value="NOT_REPORTED">Not Reported Only ({summaryStats.notReported})</option>
                </select>
              </div>

              {/* Search Bar */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  Search Applicant
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search name, barcode, roll..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Waiting List Table */}
            <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-amber-50 dark:bg-stone-800/80 border-b border-amber-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 text-center w-12">Sl</th>
                    <th className="py-3 px-3">Barcode / App No</th>
                    <th className="py-3 px-3">Mobile Number</th>
                    <th className="py-3 px-4">Applicant Name</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3 text-center">Category</th>
                    <th className="py-3 px-3 text-center">Marks & % (Sec / Max / %)</th>
                    <th className="py-3 px-4 text-center">Status & Reporting Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {filteredWaitingStudents.length > 0 ? (
                    filteredWaitingStudents.map((student, idx) => (
                      <tr 
                        key={student.id} 
                        className={`transition-colors ${
                          student.reported 
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50' 
                            : 'hover:bg-amber-50/40 dark:hover:bg-stone-800/40'
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-mono font-bold text-stone-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                          {student.barcode}
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-600 dark:text-stone-400">
                          {student.phone || '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-900 dark:text-stone-100">
                          <div>
                            <div>{student.name}</div>
                            {student.fatherName && (
                              <div className="text-[10px] text-stone-400 font-normal">
                                Parent: {student.fatherName}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-stone-800 dark:text-stone-200">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-[11px]">
                            {student.departmentName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            {student.category || 'GEN'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-stone-800 dark:text-stone-200">
                          <div>
                            <span className="font-bold text-amber-900 dark:text-amber-200">
                              {student.percentage !== undefined ? `${student.percentage}%` : (student.mark ? `${student.mark}%` : '—')}
                            </span>
                            {(student.securedMark !== undefined || student.maxMark !== undefined) && (
                              <div className="text-[10px] text-stone-500">
                                ({student.securedMark ?? student.mark ?? '—'} / {student.maxMark ?? 600})
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Reported / Not Reported Toggle Buttons / Tabs */}
                        <td className="py-2.5 px-4 text-center">
                          <div className="inline-flex items-center p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 gap-1 shadow-inner">
                            <button
                              type="button"
                              onClick={() => handleToggleReported(student.id, true)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                student.reported
                                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500'
                                  : 'text-stone-600 dark:text-stone-400 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Reported</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleReported(student.id, false)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                !student.reported
                                  ? 'bg-stone-700 text-white shadow-sm ring-1 ring-stone-600'
                                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 hover:bg-stone-200'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Not Reported</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-stone-500">
                        {waitingStudents.length === 0 ? (
                          <div className="space-y-2">
                            <p className="font-semibold text-stone-600 dark:text-stone-400">
                              No waiting list students uploaded yet.
                            </p>
                            <p className="text-xs text-stone-400">
                              Upload an Excel or CSV file using the upload box above to begin.
                            </p>
                          </div>
                        ) : (
                          'No applicants match the active filter criteria.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary Indicator */}
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2 pt-2">
              <span>Showing {filteredWaitingStudents.length} of {waitingStudents.length} applicants in waiting pool</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Reported: {summaryStats.reported}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-400"></span>
                  <span>Not Reported: {summaryStats.notReported}</span>
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE SPOT APPLICATIONS                                             */}
      {/* ========================================================================= */}
      {(isAdmin || isSpotRoundEnabled) && activeSubTab === 'live-spot' && (
        <div className="space-y-8 animate-fade-in">
          
          <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-xs font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Real-Time Reported Applicants</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
                  Live Spot Applications Desk
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  {isAdmin 
                    ? <>Department-wise list of candidates who have been marked Reported. Click <strong>Not Reported</strong> / Undo at any time to remove them from live applications.</>
                    : <>Live real-time department-wise list of reported candidates participating in Spot Round Admissions.</>
                  }
                </p>
              </div>

              {isAdmin && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportLiveReported}
                    disabled={filteredLiveSpotApplications.length === 0}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-stone-300 dark:border-stone-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Reported (CSV)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Department Quick Filter Tabs Synced from Upload & Waiting List Pool */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedDeptFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  selectedDeptFilter === 'ALL'
                    ? 'bg-amber-700 text-white shadow-sm'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                <span>All Departments</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
                  {summaryStats.reported}
                </span>
              </button>
              {waitingPoolDepartments.map(dept => {
                const count = summaryStats.deptReportedCounts[dept] || 0;
                return (
                  <button
                    key={dept}
                    onClick={() => setSelectedDeptFilter(dept)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      selectedDeptFilter === dept
                        ? 'bg-amber-700 text-white shadow-sm'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    <span>{dept}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-bold">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Live Reported Applications Table */}
            <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-emerald-50 dark:bg-stone-800/80 border-b border-emerald-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 text-center w-12">Sl</th>
                    <th className="py-3 px-3 text-center">Waiting Rank</th>
                    <th className="py-3 px-3">Barcode / App No</th>
                    <th className="py-3 px-3">Mobile Number</th>
                    <th className="py-3 px-4">Applicant Name</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3 text-center">Category</th>
                    <th className="py-3 px-3 text-center">Marks & % (Sec / Max / %)</th>
                    <th className="py-3 px-4 text-center">{isAdmin ? 'Undo / Action' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {filteredLiveSpotApplications.length > 0 ? (
                    filteredLiveSpotApplications.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-emerald-50/40 dark:hover:bg-stone-800/40 transition-colors">
                        <td className="py-3 px-3 text-center font-mono font-bold text-stone-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                          {student.waitingRank !== undefined ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-semibold text-xs">
                              WL #{student.waitingRank}
                            </span>
                          ) : student.rank !== undefined ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-semibold text-xs">
                              WL #{student.rank}
                            </span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                          {student.barcode}
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-600 dark:text-stone-400">
                          {student.phone || '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-900 dark:text-stone-100">
                          <div>
                            <div>{student.name}</div>
                            {student.fatherName && (
                              <div className="text-[10px] text-stone-400 font-normal">
                                Parent: {student.fatherName}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold text-[11px]">
                            {student.departmentName}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            {student.category || 'GEN'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-stone-800 dark:text-stone-200">
                          <div>
                            <span className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                              {student.percentage !== undefined ? `${student.percentage.toFixed(2)}%` : (
                                student.securedMark && student.maxMark ? `${((student.securedMark / student.maxMark) * 100).toFixed(2)}%` : (
                                  student.mark ? `${student.mark}%` : '—'
                                )
                              )}
                            </span>
                            <div className="text-[10px] text-stone-500 font-medium">
                              Sec: {student.securedMark ?? student.mark ?? '—'} / Max: {student.maxMark ?? (student.securedMark && student.percentage ? Math.round((student.securedMark / student.percentage) * 100) : (student.mark && student.mark > 100 ? 600 : 600))}
                            </div>
                          </div>
                        </td>

                        {/* Undo / Status Column */}
                        <td className="py-2.5 px-4 text-center">
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleToggleReported(student.id, false)}
                              className="px-3 py-1.5 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 hover:bg-red-100 rounded-xl text-xs font-semibold border border-red-200 dark:border-red-800 inline-flex items-center gap-1 transition-all"
                              title="Undo reporting (marks student as Not Reported)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Undo (Not Reported)</span>
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Reported</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-stone-500">
                        No reported applicants found in this category. Click 'Reported' on students in the Waiting List Pool to add them here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ========================================================================= */}
            {/* PUBLISH SECTION BELOW LIVE SPOT APPLICATIONS                             */}
            {/* ========================================================================= */}
            <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-900 dark:to-stone-850 border-2 border-amber-300 dark:border-amber-800/60 shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-200 dark:border-stone-800">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-amber-600 text-white rounded-full text-[11px] font-bold">
                    <Award className="w-3.5 h-3.5" />
                    <span>Official Selection Generation & Publication</span>
                  </div>
                  <h4 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                    Publish Provisionally Selected & Waiting List
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    Calculates top merit students up to the department vacancy as <strong>Provisionally Selected</strong>, and the rest as <strong>Waiting List</strong>. Instantly updates the public view tab.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {publishedResult && (
                    <button
                      onClick={handleUnpublishResults}
                      className="px-3.5 py-2 text-xs font-bold text-stone-600 hover:text-red-600 rounded-xl border border-stone-300 dark:border-stone-700 transition-colors"
                    >
                      Unpublish Current Result
                    </button>
                  )}
                  <button
                    onClick={handlePublishResults}
                    disabled={summaryStats.reported === 0}
                    className="px-6 py-3 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-bold text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{publishedResult ? 'Re-Publish / Update Results' : 'Publish Results Now'}</span>
                  </button>
                </div>
              </div>

              {/* Vacancy Breakdown & Override Controls Synchronized from Subjects & Seat Matrix */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200/60 dark:border-stone-800">
                  <div>
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-amber-700" />
                      <span>Department Spot Vacancies (Synced from Subjects & Seat Matrix)</span>
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Vacancies are synchronized live from the approved Subjects & Seat Matrix (Sanctioned Strength minus current enrolled SAMS students).
                    </p>
                  </div>
                  <button
                    onClick={handleResyncAllFromSeatMatrix}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-amber-300 dark:border-amber-800 shrink-0 self-start sm:self-auto"
                    title="Reset all vacancies to match live Subjects & Seat Matrix"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-sync All from Seat Matrix</span>
                  </button>
                </div>

                {waitingPoolDepartments.length === 0 ? (
                  <div className="p-6 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 text-center text-xs text-stone-500">
                    No departments found in the waiting list pool yet. Please upload your waiting list Excel sheets in the "Upload & Waiting List Pool" tab.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {waitingPoolDepartments.map(dept => {
                      const info = departmentSeatMatrixInfo[dept] || { vacancy: 0, sanctionedStrength: 0, admittedCount: 0 };
                      const isCustom = customVacancies[dept] !== undefined;
                      const vacancy = departmentVacancyMap[dept] ?? info.vacancy;
                      const reportedCount = summaryStats.deptReportedCounts[dept] || 0;
                      const willSelect = Math.min(reportedCount, vacancy);
                      const willWait = Math.max(0, reportedCount - vacancy);

                      return (
                        <div 
                          key={dept} 
                          className={`p-4 bg-white dark:bg-stone-800 rounded-2xl border transition-all space-y-3 shadow-sm ${
                            isCustom 
                              ? 'border-purple-300 dark:border-purple-800 ring-1 ring-purple-400/20' 
                              : 'border-amber-200 dark:border-stone-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-xs text-stone-900 dark:text-stone-100 line-clamp-1" title={dept}>
                              {dept}
                            </span>
                            {info.matchedCode && (
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                                {info.matchedCode}
                              </span>
                            )}
                          </div>

                          {/* Seat Matrix Live Details */}
                          <div className="text-[11px] bg-stone-50 dark:bg-stone-900 p-2 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1">
                            <div className="flex justify-between text-stone-600 dark:text-stone-300">
                              <span>Seat Matrix Vacancy:</span>
                              <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{info.vacancy}</strong>
                            </div>
                            <div className="flex justify-between text-[10px] text-stone-400">
                              <span>Sanctioned: {info.sanctionedStrength}</span>
                              <span>Admitted: {info.admittedCount}</span>
                            </div>
                          </div>

                          {/* Spot Vacancy Input */}
                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-stone-600 dark:text-stone-400 font-medium">Spot Vacancy:</span>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max="300"
                                value={vacancy}
                                onChange={(e) => handleUpdateDeptVacancy(dept, parseInt(e.target.value) || 0)}
                                className={`w-14 px-2 py-1 text-right font-bold rounded-lg text-xs border ${
                                  isCustom 
                                    ? 'bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-800' 
                                    : 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
                                }`}
                              />
                              {isCustom && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = { ...customVacancies };
                                    delete updated[dept];
                                    setCustomVacancies(updated);
                                    saveSpotCustomVacancies(updated);
                                  }}
                                  className="p-1 text-stone-400 hover:text-amber-700 rounded transition-colors"
                                  title="Reset to Seat Matrix Vacancy"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Allotment Preview */}
                          <div className="text-[11px] text-stone-500 flex justify-between border-t border-stone-100 dark:border-stone-700/80 pt-2 font-medium">
                            <span>Reported: <strong>{reportedCount}</strong></span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Sel: {willSelect}</span>
                            <span className="text-amber-700 dark:text-amber-400 font-semibold">WL: {willWait}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PROVISIONALLY SELECTED & WAITING LIST                              */}
      {/* (VIEWABLE TO ALL: PUBLIC, HOD, & ADMIN ONCE PUBLISHED)                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'published-result' && (
        <div className="space-y-8 animate-fade-in">
          
          {publishedResult ? (
            <div className="space-y-8">
              
              {/* Publication Banner Header */}
              <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Official Spot Round Selection List</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
                      Provisionally Selected & Waiting List
                    </h3>
                    <p className="text-xs text-stone-500">
                      Published on {new Date(publishedResult.publishedAt).toLocaleString()} by {publishedResult.publishedBy}. Allotments made strictly in order of merit against department vacancies.
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={handleDownloadOfficialPdf}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                        title="Download official PDF file (1 department per page)"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Download Official PDF</span>
                      </button>
                      <button
                        onClick={handleDownloadOfficialWord}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                        title="Download official Word document (.doc / .docx)"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Download Official Word (.doc)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Filter Controls: Department Selector & Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setSelectedDeptFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        selectedDeptFilter === 'ALL'
                          ? 'bg-amber-700 text-white shadow-sm'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                      }`}
                    >
                      <span>All Departments</span>
                    </button>
                    {publishedResult.departments.map(dept => (
                      <button
                        key={dept.deptName}
                        onClick={() => setSelectedDeptFilter(dept.deptName)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          selectedDeptFilter === dept.deptName
                            ? 'bg-amber-700 text-white shadow-sm'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        <span>{dept.deptName}</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                          {dept.selectedStudents.length}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search name, barcode, roll..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Department Results Render */}
              {publishedResult.departments
                .filter(dept => selectedDeptFilter === 'ALL' || dept.deptName === selectedDeptFilter)
                .map(dept => {
                  const filteredSelected = dept.selectedStudents.filter(s => {
                    if (!searchTerm.trim()) return true;
                    const term = searchTerm.toLowerCase();
                    return (
                      s.name.toLowerCase().includes(term) ||
                      s.barcode.toLowerCase().includes(term) ||
                      (s.rollNumber && s.rollNumber.toLowerCase().includes(term))
                    );
                  });

                  const filteredWaiting = dept.waitingStudents.filter(s => {
                    if (!searchTerm.trim()) return true;
                    const term = searchTerm.toLowerCase();
                    return (
                      s.name.toLowerCase().includes(term) ||
                      s.barcode.toLowerCase().includes(term) ||
                      (s.rollNumber && s.rollNumber.toLowerCase().includes(term))
                    );
                  });

                  return (
                    <div 
                      key={dept.deptName} 
                      className="dept-print-card bg-white dark:bg-stone-900 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm p-6 sm:p-8 space-y-6"
                      style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                    >
                      {/* Official Print Header visible only when printing */}
                      <div className="hidden print:block text-center border-b-2 border-stone-800 pb-3 mb-4 space-y-1">
                        <h2 className="text-xl font-serif font-extrabold tracking-tight text-stone-900 uppercase">
                          PANCHAYAT HIGHER SECONDARY / DEGREE COLLEGE, BARGARH
                        </h2>
                        <p className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                          SPOT e-ADMISSION MERIT ALLOTMENT LIST • SESSION 2026-27
                        </p>
                        <div className="flex justify-between items-center text-[11px] font-mono text-stone-700 pt-2 border-t border-stone-300 mt-2">
                          <span>DEPARTMENT: <strong className="text-black uppercase">{dept.deptName}</strong></span>
                          <span>SANCTIONED VACANCY: <strong>{dept.vacancy} SEATS</strong></span>
                          <span>PUBLISHED: <strong>{publishedResult ? new Date(publishedResult.publishedAt).toLocaleDateString() : ''}</strong></span>
                        </div>
                      </div>
                      {/* Department Heading & Vacancy Badge */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-amber-100 text-amber-800 dark:bg-stone-800 dark:text-amber-300 rounded-2xl">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                              {dept.deptName}
                            </h4>
                            <p className="text-xs text-stone-500">
                              Total Reported Candidates: <strong>{dept.reportedCount}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-bold">
                          <div className="px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                            Available Vacancy: {dept.vacancy} Seats
                          </div>
                          <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Selected: {dept.selectedStudents.length}
                          </div>
                          <div className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            Waiting: {dept.waitingStudents.length}
                          </div>
                        </div>
                      </div>

                      {/* SECTION 1: PROVISIONALLY SELECTED CANDIDATES */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                          <h5 className="font-serif font-bold text-base text-emerald-900 dark:text-emerald-300">
                            Provisionally Selected Candidates (Rank #1 to #{dept.vacancy})
                          </h5>
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            {filteredSelected.length} Allotted
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-bold uppercase tracking-wider text-[11px] border-b border-emerald-200 dark:border-emerald-800">
                                <th className="py-2.5 px-3 text-center w-16">Allot Rank</th>
                                <th className="py-2.5 px-3">Barcode / App No</th>
                                <th className="py-2.5 px-3">Mobile Number</th>
                                <th className="py-2.5 px-4">Candidate Name</th>
                                <th className="py-2.5 px-3 text-center">Category</th>
                                <th className="py-2.5 px-3 text-center">Marks & % (Sec / Max / %)</th>
                                <th className="py-2.5 px-4 text-center">Allotment Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-100 dark:divide-emerald-950/60">
                              {filteredSelected.length > 0 ? (
                                filteredSelected.map((s) => (
                                  <tr key={s.id} className="hover:bg-emerald-100/40 transition-colors">
                                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-800 dark:text-emerald-300">
                                      #{s.selectionRank}
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                                      {s.barcode}
                                    </td>
                                    <td className="py-3 px-3 font-mono text-stone-600 dark:text-stone-400">
                                      {s.phone || '—'}
                                    </td>
                                    <td className="py-3 px-4 font-bold text-stone-900 dark:text-stone-100">
                                      <div>
                                        <div>{s.name}</div>
                                        {s.fatherName && (
                                          <div className="text-[10px] text-stone-500 font-normal">
                                            Parent: {s.fatherName}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                        {s.category || 'GEN'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono text-emerald-900 dark:text-emerald-200">
                                      <div>
                                        <span className="font-bold">
                                          {s.percentage !== undefined ? `${s.percentage}%` : (s.mark ? `${s.mark}%` : '—')}
                                        </span>
                                        {(s.securedMark !== undefined || s.maxMark !== undefined) && (
                                          <div className="text-[10px] text-stone-500 font-normal">
                                            ({s.securedMark ?? s.mark ?? '—'} / {s.maxMark ?? 600})
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Provisionally Selected</span>
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={7} className="py-6 text-center text-stone-500 text-xs">
                                    {dept.selectedStudents.length === 0 
                                      ? 'No candidates provisionally selected (zero reported or zero vacancy).'
                                      : 'No candidates match your search.'
                                    }
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* SECTION 2: WAITING LIST CANDIDATES */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <h5 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                            Waiting List Candidates (In Order of Merit)
                          </h5>
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                            {filteredWaiting.length} on WL
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-800">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold uppercase tracking-wider text-[11px] border-b border-stone-200 dark:border-stone-700">
                                <th className="py-2.5 px-3 text-center w-16">Waiting Rank</th>
                                <th className="py-2.5 px-3">Barcode / App No</th>
                                <th className="py-2.5 px-3">Mobile Number</th>
                                <th className="py-2.5 px-4">Candidate Name</th>
                                <th className="py-2.5 px-3 text-center">Category</th>
                                <th className="py-2.5 px-3 text-center">Marks & % (Sec / Max / %)</th>
                                <th className="py-2.5 px-4 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                              {filteredWaiting.length > 0 ? (
                                filteredWaiting.map((s) => (
                                  <tr key={s.id} className="hover:bg-amber-50/40 dark:hover:bg-stone-800/40 transition-colors">
                                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                                      WL #{s.waitingRank}
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                                      {s.barcode}
                                    </td>
                                    <td className="py-3 px-3 font-mono text-stone-600 dark:text-stone-400">
                                      {s.phone || '—'}
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-stone-900 dark:text-stone-100">
                                      <div>
                                        <div>{s.name}</div>
                                        {s.fatherName && (
                                          <div className="text-[10px] text-stone-500 font-normal">
                                            Parent: {s.fatherName}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                                        {s.category || 'GEN'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono text-stone-800 dark:text-stone-200">
                                      <div>
                                        <span className="font-bold">
                                          {s.percentage !== undefined ? `${s.percentage}%` : (s.mark ? `${s.mark}%` : '—')}
                                        </span>
                                        {(s.securedMark !== undefined || s.maxMark !== undefined) && (
                                          <div className="text-[10px] text-stone-500 font-normal">
                                            ({s.securedMark ?? s.mark ?? '—'} / {s.maxMark ?? 600})
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Waiting List</span>
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={7} className="py-6 text-center text-stone-500 text-xs">
                                    {dept.waitingStudents.length === 0
                                      ? 'No candidates on waiting list for this department.'
                                      : 'No candidates match your search.'
                                    }
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  );
                })}

            </div>
          ) : (
            /* Result not yet published message */
            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-amber-200 dark:border-stone-800 p-8 sm:p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-stone-800 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                  Spot Round Selection Not Yet Published
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Spot round verification and reporting is currently underway. The college administration will publish the official <strong>Provisionally Selected & Waiting List</strong> here once reporting concludes.
                </p>
              </div>

              {isAdmin && (
                <div className="pt-2">
                  <button
                    onClick={() => setActiveSubTab('live-spot')}
                    className="px-5 py-2.5 bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition-all inline-flex items-center gap-2"
                  >
                    <span>Go to Live Spot Desk to Publish</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Confirmation Modal to Clear All Waiting Students */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
              Clear All Uploaded Applicants?
            </h4>
            <p className="text-xs text-stone-500">
              This will remove all {waitingStudents.length} candidates from the waiting list and live spot reporting desk. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllWaitingStudents}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
