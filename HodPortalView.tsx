import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  BookOpen, 
  CheckCircle2, 
  Edit3, 
  Users, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Trash2, 
  X, 
  RotateCw, 
  Sparkles, 
  AlertCircle, 
  Check, 
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Download,
  ExternalLink
} from 'lucide-react';
import { Department, Student, Faculty } from '../types';
import * as XLSX from 'xlsx';
import { 
  HodAccount, 
  getHodCredentials, 
  saveHodCredentials,
  updateHodPassword, 
  generateRandomPassword,
  DEFAULT_HOD_ACCOUNTS
} from '../utils/hodAuthService';
import { 
  getSavedSanctionedSeats, 
  getDepartmentIntakeSummary,
  ALL_SUBJECT_DEFINITIONS,
  matchesSubjectDefinition
} from '../utils/sanctionedSeatsService';

interface HodPortalViewProps {
  departments: Department[];
  students: Student[];
  faculty?: Faculty[];
  userRole: 'admin' | 'hod' | 'student' | null;
  userInfo: { name: string; email: string; deptId?: string; hodId?: string; subjectName?: string } | null;
  onUpdateDepartment: (dept: Department) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent?: (studentId: string) => void;
  onOpenLogin?: () => void;
  studentIdTabEnabled?: boolean;
  studentDirectoryEnabled?: boolean;
  subjectCounsellingTabEnabled?: boolean;
  onToggleStudentIdTab?: (enabled: boolean) => void;
  onToggleStudentDirectory?: (enabled: boolean) => void;
  onToggleSubjectCounsellingTab?: (enabled: boolean) => void;
  hodAccounts?: HodAccount[];
}

// Master list of 20 Regular Honours Departments
const REGULAR_DEPARTMENTS_LIST = [
  { id: 'dept-math', code: 'MATH', name: 'Department of Mathematics', subject: 'Mathematics', hodId: 'MATHEMATICS_HOD' },
  { id: 'dept-physics', code: 'PHYS', name: 'Department of Physics', subject: 'Physics', hodId: 'PHYSICS_HOD' },
  { id: 'dept-chem', code: 'CHEM', name: 'Department of Chemistry', subject: 'Chemistry', hodId: 'CHEMISTRY_HOD' },
  { id: 'dept-bot', code: 'BOTN', name: 'Department of Botany', subject: 'Botany', hodId: 'BOTANY_HOD' },
  { id: 'dept-zoo', code: 'ZOOL', name: 'Department of Zoology', subject: 'Zoology', hodId: 'ZOOLOGY_HOD' },
  { id: 'dept-stat', code: 'STAT', name: 'Department of Statistics', subject: 'Statistics', hodId: 'STATISTICS_HOD' },
  { id: 'dept-cs', code: 'COMP', name: 'Department of Computer Science', subject: 'Computer Science', hodId: 'COMPUTER_SCIENCE_HOD' },
  { id: 'dept-comm', code: 'COMM', name: 'Department of Commerce', subject: 'Commerce', hodId: 'COMMERCE_HOD' },
  { id: 'dept-eng', code: 'ENGL', name: 'Department of English', subject: 'English', hodId: 'ENGLISH_HOD' },
  { id: 'dept-odia', code: 'ODIA', name: 'Department of Odia', subject: 'Odia', hodId: 'ODIA_HOD' },
  { id: 'dept-hindi', code: 'HNDI', name: 'Department of Hindi', subject: 'Hindi', hodId: 'HINDI_HOD' },
  { id: 'dept-sans', code: 'SANS', name: 'Department of Sanskrit', subject: 'Sanskrit', hodId: 'SANSKRIT_HOD' },
  { id: 'dept-hist', code: 'HIST', name: 'Department of History', subject: 'History', hodId: 'HISTORY_HOD' },
  { id: 'dept-ps', code: 'POLS', name: 'Department of Political Science', subject: 'Political Science', hodId: 'POLITICAL_SCIENCE_HOD' },
  { id: 'dept-eco', code: 'ECON', name: 'Department of Economics', subject: 'Economics', hodId: 'ECONOMICS_HOD' },
  { id: 'dept-phil', code: 'PHIL', name: 'Department of Philosophy', subject: 'Philosophy', hodId: 'PHILOSOPHY_HOD' },
  { id: 'dept-socio', code: 'SOCI', name: 'Department of Sociology', subject: 'Sociology', hodId: 'SOCIOLOGY_HOD' },
  { id: 'dept-psych', code: 'PSYC', name: 'Department of Psychology', subject: 'Psychology', hodId: 'PSYCHOLOGY_HOD' },
  { id: 'dept-geog', code: 'GEOG', name: 'Department of Geography', subject: 'Geography', hodId: 'GEOGRAPHY_HOD' },
  { id: 'dept-educ', code: 'EDUC', name: 'Department of Education', subject: 'Education', hodId: 'EDUCATION_HOD' }
];

export const HodPortalView: React.FC<HodPortalViewProps> = ({
  departments,
  students,
  faculty = [],
  userRole,
  userInfo,
  onUpdateDepartment,
  onUpdateStudent,
  onDeleteStudent,
  onOpenLogin,
  studentIdTabEnabled = true,
  studentDirectoryEnabled = true,
  subjectCounsellingTabEnabled = true,
  onToggleStudentIdTab,
  onToggleStudentDirectory,
  onToggleSubjectCounsellingTab,
  hodAccounts: propsHodAccounts
}) => {
  const isAdmin = userRole === 'admin';
  const isHod = userRole === 'hod';

  const [departmentViewMode, setDepartmentViewMode] = useState<'students' | 'student-id' | 'subject-counselling'>('students');
  const [counsellingCourseType, setCounsellingCourseType] = useState<'regular' | 'aedp'>('regular');

  // HOD Accounts state (for admin password management)
  const [hodAccounts, setHodAccounts] = useState<HodAccount[]>(() => {
    if (propsHodAccounts && propsHodAccounts.length > 0) return propsHodAccounts;
    return DEFAULT_HOD_ACCOUNTS;
  });
  const [showPasswords, setShowPasswords] = useState<{ [hodId: string]: boolean }>({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [hodSearchTerm, setHodSearchTerm] = useState('');
  const [editingHod, setEditingHod] = useState<HodAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [editingHodName, setEditingHodName] = useState('');
  const [editingHodEmail, setEditingHodEmail] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  // Active Tab state: either a subject code/id, or 'admin-passwords'
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (isHod && userInfo?.subjectName) {
      const match = REGULAR_DEPARTMENTS_LIST.find(
        d => d.subject.toLowerCase() === userInfo.subjectName?.toLowerCase()
      );
      if (match) return match.id;
    }
    return REGULAR_DEPARTMENTS_LIST[0].id;
  });

  // Load HOD credentials and sync with faculty directory
  useEffect(() => {
    if (propsHodAccounts && propsHodAccounts.length > 0) {
      setHodAccounts(propsHodAccounts);
      return;
    }
    const loadCreds = async () => {
      const accounts = await getHodCredentials();
      const synced = accounts.map(acc => {
        const matchingFaculty = faculty.find(f => {
          const fDept = (f.departmentName || '').toLowerCase();
          const subj = acc.subjectName.toLowerCase();
          const isMatch = fDept.includes(subj) || subj.includes(fDept);
          const isHodType = f.facultyType === 'HOD' || (f.designation || '').toLowerCase().includes('hod') || (f.designation || '').toLowerCase().includes('head');
          return isMatch && isHodType;
        }) || faculty.find(f => {
          const fDept = (f.departmentName || '').toLowerCase();
          const subj = acc.subjectName.toLowerCase();
          return fDept.includes(subj) || subj.includes(fDept);
        });

        if (matchingFaculty) {
          return {
            ...acc,
            hodName: matchingFaculty.name,
            email: matchingFaculty.email
          };
        }
        return acc;
      });
      setHodAccounts(synced.length > 0 ? synced : DEFAULT_HOD_ACCOUNTS);
    };
    loadCreds();
  }, [faculty, propsHodAccounts]);

  const effectiveHodAccounts = useMemo(() => {
    if (hodAccounts && hodAccounts.length > 0) return hodAccounts;
    if (propsHodAccounts && propsHodAccounts.length > 0) return propsHodAccounts;
    return DEFAULT_HOD_ACCOUNTS;
  }, [hodAccounts, propsHodAccounts]);

  const filteredHodAccounts = useMemo(() => {
    if (!hodSearchTerm.trim()) return effectiveHodAccounts;
    const term = hodSearchTerm.toLowerCase().trim();
    return effectiveHodAccounts.filter(acc => {
      const haystack = [
        acc.id,
        acc.subjectName,
        acc.courseName,
        acc.hodName,
        acc.email,
        acc.password
      ].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [effectiveHodAccounts, hodSearchTerm]);

  // Lock HOD to their subject if logged in as HOD
  useEffect(() => {
    if (isHod && userInfo?.subjectName) {
      const match = REGULAR_DEPARTMENTS_LIST.find(
        d => d.subject.toLowerCase() === userInfo.subjectName?.toLowerCase()
      );
      if (match) {
        setActiveTab(match.id);
      }
    }
  }, [isHod, userInfo?.subjectName]);

  // Find active department object
  const activeDeptConfig = useMemo(() => {
    return REGULAR_DEPARTMENTS_LIST.find(d => d.id === activeTab) || REGULAR_DEPARTMENTS_LIST[0];
  }, [activeTab]);

  // Load sanctioned seats matrix map
  const sanctionedSeatsMap = useMemo(() => getSavedSanctionedSeats(), []);

  // Compute synchronized intake capacity summary (Regular Honours + Corresponding AEDP)
  const deptIntakeSummary = useMemo(() => {
    return getDepartmentIntakeSummary(activeDeptConfig.subject, sanctionedSeatsMap, students);
  }, [activeDeptConfig.subject, sanctionedSeatsMap, students]);

  const activeDept = useMemo(() => {
    const found = departments.find(d => d.id === activeDeptConfig.id);
    const subjNorm = activeDeptConfig.subject.toLowerCase();
    const matchingFaculty = faculty.find(f => {
      const fDept = (f.departmentName || '').toLowerCase();
      const isMatchDept = fDept.includes(subjNorm) || subjNorm.includes(fDept);
      const isHodType = f.facultyType === 'HOD' || (f.designation || '').toLowerCase().includes('hod') || (f.designation || '').toLowerCase().includes('head');
      return isMatchDept && isHodType;
    }) || faculty.find(f => {
      const fDept = (f.departmentName || '').toLowerCase();
      return fDept.includes(subjNorm) || subjNorm.includes(fDept);
    });

    const hodName = matchingFaculty?.name || found?.hodName || 'Head of Department';
    const hodEmail = matchingFaculty?.email || found?.hodEmail || `hod.${activeDeptConfig.code.toLowerCase()}@samspanchayat.edu.in`;

    return {
      id: activeDeptConfig.id,
      name: activeDeptConfig.name,
      code: activeDeptConfig.code,
      hodName,
      hodEmail,
      totalSeats: deptIntakeSummary.totalIntakeCapacity,
      filledSeats: deptIntakeSummary.totalEnrolled,
      description: found?.description || `Official ${activeDeptConfig.name} offering Regular Honours and corresponding AEDP programs.`,
      regularSyllabusUrl: found?.regularSyllabusUrl || found?.curriculumUrl || '',
      aedpSyllabusUrl: found?.aedpSyllabusUrl || ''
    };
  }, [departments, faculty, activeDeptConfig, deptIntakeSummary]);

  // Local state for department info editor
  const [totalSeats, setTotalSeats] = useState(deptIntakeSummary.totalIntakeCapacity);
  const [filledSeats, setFilledSeats] = useState(deptIntakeSummary.totalEnrolled);
  const [regularSyllabusUrl, setRegularSyllabusUrl] = useState(activeDept.regularSyllabusUrl);
  const [aedpSyllabusUrl, setAedpSyllabusUrl] = useState(activeDept.aedpSyllabusUrl);
  const [syllabusTab, setSyllabusTab] = useState<'regular' | 'aedp'>('regular');
  const [syllabusInputMode, setSyllabusInputMode] = useState<'url' | 'file'>('url');
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [deptSaveMsg, setDeptSaveMsg] = useState('');

  useEffect(() => {
    setTotalSeats(deptIntakeSummary.totalIntakeCapacity);
    setFilledSeats(deptIntakeSummary.totalEnrolled);
    setRegularSyllabusUrl(activeDept.regularSyllabusUrl);
    setAedpSyllabusUrl(activeDept.aedpSyllabusUrl);
  }, [deptIntakeSummary, activeDept]);

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (syllabusInputMode === 'file' && syllabusFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileDataUrl = reader.result as string;
        const updatedReg = syllabusTab === 'regular' ? fileDataUrl : regularSyllabusUrl;
        const updatedAedp = syllabusTab === 'aedp' ? fileDataUrl : aedpSyllabusUrl;

        onUpdateDepartment({
          ...activeDept,
          totalSeats: isAdmin ? totalSeats : activeDept.totalSeats,
          filledSeats: isAdmin ? filledSeats : activeDept.filledSeats,
          regularSyllabusUrl: updatedReg,
          aedpSyllabusUrl: updatedAedp
        });
        setDeptSaveMsg('Department syllabus & details saved successfully!');
        setSyllabusFile(null);
        setTimeout(() => setDeptSaveMsg(''), 4000);
      };
      reader.readAsDataURL(syllabusFile);
    } else {
      onUpdateDepartment({
        ...activeDept,
        totalSeats: isAdmin ? totalSeats : activeDept.totalSeats,
        filledSeats: isAdmin ? filledSeats : activeDept.filledSeats,
        regularSyllabusUrl,
        aedpSyllabusUrl
      });
      setDeptSaveMsg('Department syllabus & details saved successfully!');
      setTimeout(() => setDeptSaveMsg(''), 4000);
    }
  };

  // Student filtering for the active department (Regular + AEDP courses for this subject)
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<'ALL' | 'REGULAR' | 'AEDP'>('ALL');

  const deptStudents = useMemo(() => {
    const norm = activeDeptConfig.subject.toLowerCase().replace(/^department of /i, '').trim();

    // Find regular subject definition
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

    // Find AEDP subject definition
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

    return students.filter(s => {
      const isRegularMatch = regularSub ? matchesSubjectDefinition(s.subject, regularSub) : false;
      const isAedpMatch = aedpSub ? matchesSubjectDefinition(s.subject, aedpSub) : false;

      // Strict match based on the student's 'subject' field matching the department's definitions
      // or directly matching the department subject name/code.
      const subjLower = (s.subject || '').toLowerCase();
      const deptSubjLower = activeDeptConfig.subject.toLowerCase();
      const deptCodeLower = activeDeptConfig.code.toLowerCase();

      const directMatch = 
        subjLower === deptSubjLower || 
        subjLower === deptCodeLower || 
        subjLower.includes(deptSubjLower);

      const matches = isRegularMatch || isAedpMatch || directMatch;
      if (!matches) return false;

      // Check AEDP vs Regular filter (isAedpStudent is true if matches AEDP definition or subject contains 'aedp')
      const isAedpStudent = isAedpMatch || subjLower.includes('aedp');
      if (courseFilter === 'REGULAR' && isAedpStudent) return false;
      if (courseFilter === 'AEDP' && !isAedpStudent) return false;

      // Check search term
      if (!studentSearchTerm.trim()) return true;
      const term = studentSearchTerm.toLowerCase().trim();
      const searchable = [
        s.name,
        s.rollNumber,
        s.barcode,
        s.fatherName,
        s.motherName,
        s.parentsName,
        s.aadhaarCard,
        s.email,
        s.phone,
        s.address,
        s.subject
      ].filter(Boolean).join(' ').toLowerCase();

      return searchable.includes(term);
    }).map(s => {
      const subjLower = (s.subject || '').toLowerCase();
      const isRegularMatch = regularSub ? matchesSubjectDefinition(s.subject, regularSub) : false;
      const isAedpMatch = aedpSub ? matchesSubjectDefinition(s.subject, aedpSub) : false;
      const isAedp = isAedpMatch || subjLower.includes('aedp');
      return { ...s, _isAedp: isAedp };
    }).sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
  }, [students, activeDeptConfig, studentSearchTerm, courseFilter]);

  const regularCounsellingStudents = useMemo(() => deptStudents.filter(s => !(s as any)._isAedp), [deptStudents]);
  const aedpCounsellingStudents = useMemo(() => deptStudents.filter(s => (s as any)._isAedp), [deptStudents]);

  // Edit Student Modal state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentFormSuccess, setStudentFormSuccess] = useState('');

  // Export department students to Excel and PDF Landscape
  const exportDeptExcel = () => {
    const dataToExport = deptStudents.map((s, idx) => ({
      'Sl No': idx + 1,
      'Roll Number': s.rollNumber || '',
      'Univ. Roll No': s.universityRollNumber || '',
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
    XLSX.utils.book_append_sheet(workbook, worksheet, `${activeDeptConfig.code} Students`);
    XLSX.writeFile(workbook, `SAMS_${activeDeptConfig.code}_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportDeptPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups for this website to export PDF.');
      return;
    }

    const rowsHTML = deptStudents.map((s, idx) => `
      <tr>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: bold;">${s.rollNumber || ''}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${s.universityRollNumber || ''}</td>
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
          <title>Department Students - ${activeDeptConfig.subject} - Panchayat College</title>
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
          <h2>Panchayat College, Baragada - ${activeDeptConfig.subject} Student Directory</h2>
          <p class="subtitle">Generated on ${new Date().toLocaleDateString()} | Total Students: ${deptStudents.length}</p>
          <table>
            <thead>
              <tr>
                <th>Sl No</th>
                <th>Roll Number</th>
                <th>Univ. Roll No</th>
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

  const handleOpenEditStudent = (s: Student) => {
    setEditingStudent({ ...s });
    setStudentFormSuccess('');
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    // Construct parentsName
    let parentsName = editingStudent.parentsName;
    if (editingStudent.fatherName || editingStudent.motherName) {
      parentsName = `F: ${editingStudent.fatherName || 'N/A'}${editingStudent.motherName ? ` / M: ${editingStudent.motherName}` : ''}`;
    }

    const updated: Student = {
      ...editingStudent,
      parentsName
    };

    onUpdateStudent(updated);
    setStudentFormSuccess('Student record updated successfully!');
    setTimeout(() => {
      setStudentFormSuccess('');
      setEditingStudent(null);
    }, 1500);
  };

  const exportCounsellingExcel = () => {
    const studentsToExport = counsellingCourseType === 'regular' ? regularCounsellingStudents : aedpCounsellingStudents;
    const dataToExport = studentsToExport.map((s, idx) => {
      if (counsellingCourseType === 'regular') {
        return {
          'Sl No': idx + 1,
          'Roll Number': s.rollNumber || '',
          'Applicant Name': s.name || '',
          'Major': s.counsellingMajor || s.subject || '',
          'Minor 1': s.counsellingMinor1 || '',
          'Minor 2': s.counsellingMinor2 || '',
          'AEC': s.counsellingAec || '',
          'SEC': s.counsellingSec || '',
          'MDC': s.counsellingMdc || ''
        };
      } else {
        return {
          'Sl No': idx + 1,
          'Roll Number': s.rollNumber || '',
          'Applicant Name': s.name || '',
          'Major 1': s.counsellingAedpMajor1 || s.subject || '',
          'Major 2': s.counsellingAedpMajor2 || deptIntakeSummary.regularCourseName || activeDeptConfig.subject || '',
          'MDC 1': s.counsellingAedpMdc1 || '',
          'MDC 2': s.counsellingAedpMdc2 || '',
          'SEC 1': s.counsellingAedpSec1 || '',
          'SEC 2': s.counsellingAedpSec2 || ''
        };
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    const sheetName = counsellingCourseType === 'regular' ? 'NEP Counselling' : 'AEDP Counselling';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `SAMS_${activeDeptConfig.code}_Counselling_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportCounsellingPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups for this website to export PDF.');
      return;
    }

    const studentsToExport = counsellingCourseType === 'regular' ? regularCounsellingStudents : aedpCounsellingStudents;
    const isRegular = counsellingCourseType === 'regular';

    const rowsHTML = studentsToExport.map((s, idx) => {
      if (isRegular) {
        return `
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: bold;">${s.rollNumber || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: bold;">${s.name || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingMajor || s.subject || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingMinor1 || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingMinor2 || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingAec || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingSec || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingMdc || ''}</td>
          </tr>
        `;
      } else {
        return `
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: bold;">${s.rollNumber || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: bold;">${s.name || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingAedpMajor1 || s.subject || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingAedpMajor2 || deptIntakeSummary.regularCourseName || activeDeptConfig.subject || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingAedpMdc1 || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingAedpMdc2 || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingAedpSec1 || ''}</td>
            <td style="border: 1px solid #d1d5db; padding: 6px;">${s.counsellingAedpSec2 || ''}</td>
          </tr>
        `;
      }
    }).join('');

    const headersHTML = isRegular ? `
      <th>Sl No</th>
      <th>Roll Number</th>
      <th>Applicant Name</th>
      <th>Major</th>
      <th>Minor 1</th>
      <th>Minor 2</th>
      <th>AEC</th>
      <th>SEC</th>
      <th>MDC</th>
    ` : `
      <th>Sl No</th>
      <th>Roll Number</th>
      <th>Applicant Name</th>
      <th>Major 1</th>
      <th>Major 2</th>
      <th>MDC 1</th>
      <th>MDC 2</th>
      <th>SEC 1</th>
      <th>SEC 2</th>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Subject Counselling - ${activeDeptConfig.subject} - Panchayat College</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: Arial, sans-serif; font-size: 10px; color: #111; margin: 0; padding: 10px; }
            h2 { text-align: center; margin-bottom: 4px; font-size: 16px; }
            p.subtitle { text-align: center; margin-top: 0; margin-bottom: 12px; font-size: 11px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th { background-color: ${isRegular ? '#78350f' : '#065f46'}; color: white; border: 1px solid #d1d5db; padding: 6px 4px; font-size: 9px; text-align: left; }
            td { font-size: 9px; color: #222; border: 1px solid #d1d5db; }
            tr:nth-child(even) { background-color: #fdfbf7; }
          </style>
        </head>
        <body>
          <h2>Panchayat College, Baragada - ${activeDeptConfig.subject} ${isRegular ? 'NEP' : 'AEDP'} Subject Counselling</h2>
          <p class="subtitle">Generated on ${new Date().toLocaleDateString()} | Total Students: ${studentsToExport.length}</p>
          <table>
            <thead><tr>${headersHTML}</tr></thead>
            <tbody>${rowsHTML}</tbody>
          </table>
          <script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleUpdateStudentField = (studentId: string, field: keyof Student, value: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    if (isHod && userInfo?.subjectName) {
      // Permission check for specific fields
      if (field === 'universityRollNumber' && !studentDirectoryEnabled) {
        return;
      }

      const isMatch = student.subject.toLowerCase().includes(userInfo.subjectName.toLowerCase()) || 
                      student.departmentName.toLowerCase().includes(userInfo.subjectName.toLowerCase()) ||
                      activeDeptConfig.subject.toLowerCase() === student.subject.toLowerCase();
      if (!isMatch) {
        alert('You can only edit student details for your own department.');
        return;
      }
    }
    const updated: Student = {
      ...student,
      [field]: value
    };
    onUpdateStudent(updated);
  };

  // Password & Account edit modal handlers for Super Admin
  const handleOpenPasswordEdit = (account: HodAccount) => {
    setEditingHod(account);
    setNewPasswordInput(account.password);
    setEditingHodName(account.hodName || '');
    setEditingHodEmail(account.email || '');
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHod) return;

    if (newPasswordInput.trim().length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    const updatedAccount: HodAccount = {
      ...editingHod,
      password: newPasswordInput.trim(),
      hodName: editingHodName.trim() || editingHod.hodName,
      email: editingHodEmail.trim() || editingHod.email
    };

    const updatedList = effectiveHodAccounts.map(acc => acc.id === editingHod.id ? updatedAccount : acc);
    await saveHodCredentials(updatedList);
    setHodAccounts(updatedList);
    setPasswordSuccessMsg(`Account details & security password for ${editingHod.id} updated successfully!`);
    setEditingHod(null);
    setTimeout(() => setPasswordSuccessMsg(''), 4000);
  };

  const handleGenerateAndSetRandomPass = () => {
    const pass = generateRandomPassword(8);
    setNewPasswordInput(pass);
  };

  const exportHodCredentialsExcel = () => {
    const dataToExport = effectiveHodAccounts.map((acc, idx) => ({
      'Sl No': idx + 1,
      'Department Name': acc.subjectName,
      'Course Name': acc.courseName,
      'HOD Account ID': acc.id,
      'HOD Name': acc.hodName,
      'HOD Official Email': acc.email,
      'Account Security Password': acc.password
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HOD Credentials');
    XLSX.writeFile(workbook, `SAMS_HOD_Account_Credentials_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportHodCredentialsPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups to print credentials.');
      return;
    }

    const rowsHTML = effectiveHodAccounts.map((acc, idx) => `
      <tr>
        <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; font-weight: bold;">${acc.subjectName}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; font-family: monospace; font-weight: bold; color: #92400e;">${acc.id}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${acc.hodName}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px;">${acc.email}</td>
        <td style="border: 1px solid #d1d5db; padding: 6px; font-family: monospace; font-weight: bold; color: #b45309;">${acc.password}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SAMS HOD Account IDs & Credentials - Panchayat College</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 15px; }
            h2 { text-align: center; margin-bottom: 4px; color: #78350f; font-size: 18px; }
            p.subtitle { text-align: center; margin-top: 0; margin-bottom: 16px; font-size: 12px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #78350f; color: white; border: 1px solid #d1d5db; padding: 8px; font-size: 11px; text-align: left; }
            td { font-size: 10px; border: 1px solid #d1d5db; }
            tr:nth-child(even) { background-color: #fdfbf7; }
          </style>
        </head>
        <body>
          <h2>Panchayat College Baragada - Official HOD Account Credentials</h2>
          <p class="subtitle">Confidential Super Admin Reference Document | Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Sl No</th>
                <th>Honours Department</th>
                <th>HOD Account ID</th>
                <th>Head Name</th>
                <th>Official Email</th>
                <th>Security Password</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-700 to-orange-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <Shield className="w-4 h-4 text-amber-200" />
              <span>HOD & Department Access Management</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold">
              Department Tabs & Course Control
            </h2>
            <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Each regular honours course features dedicated HOD access. HODs can view and edit student records for their regular and AEDP courses. Super Admin manages HOD account passwords.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-xs space-y-1 shrink-0">
            <p className="font-semibold text-amber-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Current Status:</span>
            </p>
            <p className="font-bold text-white uppercase tracking-wider">
              {isAdmin ? 'Admin' : isHod ? `HOD (${activeDept.hodName || userInfo?.name || 'Authorized'})` : `Public / Student Guest (HOD: ${activeDept.hodName})`}
            </p>
            {!userRole && onOpenLogin && (
              <button
                onClick={onOpenLogin}
                className="mt-2 w-full px-3 py-1.5 bg-white text-amber-900 hover:bg-amber-100 rounded-xl font-bold text-[11px] shadow transition-colors flex items-center justify-center gap-1"
              >
                <span>Log In as HOD / Admin</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-4 text-xs relative z-10">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-bold text-amber-200">Admin Tab Access Controls:</span>
              <label className="flex items-center gap-2 cursor-pointer bg-black/20 px-3 py-1.5 rounded-xl">
                <input
                  type="checkbox"
                  checked={studentIdTabEnabled}
                  onChange={(e) => onToggleStudentIdTab && onToggleStudentIdTab(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-white font-semibold">Student ID Tab</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-black/20 px-3 py-1.5 rounded-xl">
                <input
                  type="checkbox"
                  checked={studentDirectoryEnabled}
                  onChange={(e) => onToggleStudentDirectory && onToggleStudentDirectory(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-white font-semibold">Edit University Roll Number</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-black/20 px-3 py-1.5 rounded-xl">
                <input
                  type="checkbox"
                  checked={subjectCounsellingTabEnabled}
                  onChange={(e) => onToggleSubjectCounsellingTab && onToggleSubjectCounsellingTab(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-white font-semibold">Subject Counselling Tab</span>
              </label>
            </div>

            <button
              onClick={() => setActiveTab('admin-passwords')}
              className="flex items-center gap-1.5 bg-amber-950 hover:bg-black text-amber-100 font-bold px-4 py-2 rounded-xl border border-amber-400/50 shadow-md transition-all text-xs"
            >
              <KeyRound className="w-4 h-4 text-amber-300" />
              <span>🔑 Super Admin: HOD Passwords Control</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Navigation Bar for 20 Departments + Admin Password Manager */}
      <div className="p-3">
        <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
          <span>Select Regular Honours Department Tab:</span>
          {isHod && (
            <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Access Scoped to {userInfo?.subjectName || 'HOD Course'}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {/* Admin Exclusive HOD Password Manager Tab */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin-passwords')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'admin-passwords'
                  ? 'bg-amber-900 text-white shadow-md ring-2 ring-amber-400'
                  : 'bg-amber-100/80 text-amber-900 dark:bg-stone-800 dark:text-amber-300 hover:bg-amber-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>🔒 Admin: HOD Security Passwords</span>
            </button>
          )}

          {/* 20 Regular Honours Department Tabs */}
          {REGULAR_DEPARTMENTS_LIST.map((dept) => {
            const isSelected = activeTab === dept.id;
            const isHodAssigned = isHod && userInfo?.subjectName?.toLowerCase() === dept.subject.toLowerCase();
            const isDisabledForHod = isHod && !isHodAssigned;

            return (
              <button
                key={dept.id}
                onClick={() => {
                  if (!isDisabledForHod) setActiveTab(dept.id);
                }}
                disabled={isDisabledForHod}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-700 text-white shadow-md'
                    : isDisabledForHod
                    ? 'opacity-40 cursor-not-allowed text-stone-400 dark:text-stone-600'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-stone-700'
                }`}
                title={isDisabledForHod ? 'Logged in HOD is restricted to their assigned department' : undefined}
              >
                <span>{dept.subject}</span>
                {isHodAssigned && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ADMIN EXCLUSIVE: HOD Account Passwords & Security Manager Tab */}
      {isAdmin && activeTab === 'admin-passwords' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 space-y-6 border border-amber-200 dark:border-stone-800 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 rounded-full text-xs font-bold mb-1.5">
                <KeyRound className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <span>Super Admin Exclusive Credentials Control</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
                HOD Account IDs & Security Password Controls
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Each regular honours course has an official HOD Account ID formatted as <code className="font-mono font-bold text-amber-700">[HONOURS_NAME]_HOD</code>. Super Admin can view, edit, reset, or generate passwords in real time across all devices.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setShowAllPasswords(!showAllPasswords)}
                className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-stone-300 dark:border-stone-700"
              >
                {showAllPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showAllPasswords ? 'Hide All Passwords' : 'Show All Passwords'}</span>
              </button>

              <button
                onClick={exportHodCredentialsExcel}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
              </button>

              <button
                onClick={exportHodCredentialsPDF}
                className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Print PDF Report</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={hodSearchTerm}
              onChange={(e) => setHodSearchTerm(e.target.value)}
              placeholder="Search by Department, HOD ID, Name, Email..."
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
          </div>

          {passwordSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center gap-3 text-sm animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{passwordSuccessMsg}</span>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-amber-100/70 dark:bg-stone-800 border-b border-amber-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 uppercase text-[11px] font-bold">
                  <th className="py-3.5 px-4">Sl No</th>
                  <th className="py-3.5 px-4">Honours Department</th>
                  <th className="py-3.5 px-4">HOD Account ID</th>
                  <th className="py-3.5 px-4">Head Name & Email</th>
                  <th className="py-3.5 px-4">Current Password</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-medium">
                {filteredHodAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-500 dark:text-stone-400">
                      No HOD accounts match "{hodSearchTerm}".
                    </td>
                  </tr>
                ) : (
                  filteredHodAccounts.map((acc, idx) => {
                    const isVisible = showAllPasswords || showPasswords[acc.id] || false;
                    return (
                      <tr key={acc.id} className="hover:bg-amber-50/60 dark:hover:bg-stone-800/50 transition-colors">
                        <td className="py-3 px-4 text-stone-500 font-mono text-center">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-stone-900 dark:text-stone-100">
                          {acc.courseName || acc.subjectName}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-amber-900 dark:text-amber-400">
                          <span className="bg-amber-100 dark:bg-stone-800 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-stone-700">
                            {acc.id}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-700 dark:text-stone-300">
                          <p className="font-semibold text-stone-900 dark:text-stone-100">{acc.hodName}</p>
                          <p className="text-[11px] text-stone-500 font-sans">{acc.email}</p>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <div className="flex items-center gap-2">
                            <span className="bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-lg text-amber-900 dark:text-amber-300 border border-stone-200 dark:border-stone-700">
                              {isVisible ? acc.password : '••••••••'}
                            </span>
                            <button
                              onClick={() => setShowPasswords(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                              title={isVisible ? 'Hide Password' : 'Show Password'}
                              className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 transition-colors"
                            >
                              {isVisible ? <EyeOff className="w-4 h-4 text-amber-700" /> : <Eye className="w-4 h-4 text-stone-500" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenPasswordEdit(acc)}
                            className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit / Change Password</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DEPARTMENT CONTENT VIEW (When a department tab is selected) */}
      {activeTab !== 'admin-passwords' && (
        <div className="space-y-6">
          
          {/* View Mode Sub-Tabs (Students Directory | Student ID | Subject Counselling) */}
          <div className="flex items-center gap-2 bg-white dark:bg-stone-900 p-2 rounded-2xl border border-amber-200 dark:border-stone-800 shadow-sm w-fit">
            <button
              onClick={() => setDepartmentViewMode('students')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                departmentViewMode === 'students' ? 'bg-amber-700 text-white shadow-sm' : 'text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-stone-800'
              }`}
            >
              Students Directory
            </button>

            {(isAdmin || isHod) && (
              <button
                onClick={() => setDepartmentViewMode('student-id')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  departmentViewMode === 'student-id' ? 'bg-amber-700 text-white shadow-sm' : 'text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-stone-800'
                }`}
              >
                <span>Student ID</span>
                {!studentIdTabEnabled && isAdmin && (
                  <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] rounded font-mono">DISABLED</span>
                )}
                {!studentIdTabEnabled && isHod && !isAdmin && (
                  <span className="px-1.5 py-0.2 bg-amber-600 text-white text-[9px] rounded font-mono">VIEW ONLY</span>
                )}
              </button>
            )}

            {(isAdmin || isHod) && (
              <button
                onClick={() => setDepartmentViewMode('subject-counselling')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  departmentViewMode === 'subject-counselling' ? 'bg-amber-700 text-white shadow-sm' : 'text-stone-700 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-stone-800'
                }`}
              >
                <span>Subject Counselling</span>
                {!subjectCounsellingTabEnabled && isAdmin && (
                  <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] rounded font-mono">DISABLED</span>
                )}
                {!subjectCounsellingTabEnabled && isHod && !isAdmin && (
                  <span className="px-1.5 py-0.2 bg-amber-600 text-white text-[9px] rounded font-mono">VIEW ONLY</span>
                )}
              </button>
            )}
          </div>

          {/* 1. STUDENTS DIRECTORY VIEW */}
          {departmentViewMode === 'students' && (
            <>
              
              
              

          {/* Department Students Directory (Regular + AEDP Courses) */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>Students Enrolled in {activeDeptConfig.subject}</span>
                  {(isAdmin || isHod) && (
                    <span className="text-xs font-sans font-normal text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-stone-800 px-2.5 py-0.5 rounded-full">
                      {deptStudents.length} Students
                    </span>
                  )}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Includes students enrolled in Regular Honours and corresponding AEDP courses.
                </p>
              </div>

              {/* Course Type Filter & Search Input (Only for HOD & Admin) */}
              {(isAdmin || isHod) && (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportDeptExcel}
                      className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 text-xs"
                      title="Download department students as Excel spreadsheet (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Export Excel</span>
                    </button>
                    <button
                      onClick={exportDeptPDF}
                      className="px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 text-xs"
                      title="Download/Print PDF fitting all columns"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs">
                    <button
                      onClick={() => setCourseFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        courseFilter === 'ALL' ? 'bg-amber-700 text-white shadow-sm' : 'text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      All Courses
                    </button>
                    <button
                      onClick={() => setCourseFilter('REGULAR')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        courseFilter === 'REGULAR' ? 'bg-amber-700 text-white shadow-sm' : 'text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      Regular
                    </button>
                    <button
                      onClick={() => setCourseFilter('AEDP')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        courseFilter === 'AEDP' ? 'bg-amber-700 text-white shadow-sm' : 'text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      AEDP
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      placeholder="Search name, roll no, phone..."
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Public Restricted Notice OR Authorized Students Table */}
            {(!isAdmin && !isHod) ? (
              <div className="bg-gradient-to-b from-amber-50/80 to-orange-50/50 dark:from-stone-800/60 dark:to-stone-900/60 border-2 border-dashed border-amber-300 dark:border-stone-700 rounded-3xl p-8 sm:p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 dark:bg-stone-700 text-amber-800 dark:text-amber-300 rounded-full flex items-center justify-center mx-auto shadow-inner border border-amber-300 dark:border-stone-600">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h4 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                    Student Details Restricted to Authorized Personnel
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    Student records for <strong className="text-stone-800 dark:text-stone-200">{activeDeptConfig.name}</strong> are confidential. Public access is disabled. Only the designated Head of Department (HOD) or Super Admin can view or edit student records upon log in.
                  </p>
                </div>
                {onOpenLogin && (
                  <button
                    onClick={onOpenLogin}
                    className="mt-2 px-6 py-2.5 bg-gradient-to-r from-amber-800 to-orange-800 hover:from-amber-900 hover:to-orange-900 text-white font-bold text-xs rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4 text-amber-200" />
                    <span>Log In as HOD or Admin</span>
                  </button>
                )}
              </div>
            ) : (
              /* Students Table */
              <>
                <style>{`
                  @media print {
                    @page {
                      size: A4 landscape;
                      margin: 6mm;
                    }
                    body * {
                      visibility: hidden;
                    }
                    #printable-dept-students-table, #printable-dept-students-table * {
                      visibility: visible;
                    }
                    #printable-dept-students-table {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                    }
                  }
                `}</style>
                <div id="printable-dept-students-table" className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-amber-50 dark:bg-stone-800/90 border-b border-amber-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 uppercase text-[11px] font-bold">
                      <th className="py-3.5 px-4">Roll Number</th>
                      <th className="py-3.5 px-4">Univ. Roll No</th>
                      <th className="py-3.5 px-4">Barcode</th>
                      <th className="py-3.5 px-4">Applicant Name</th>
                      <th className="py-3.5 px-4">Father & Mother Name</th>
                      <th className="py-3.5 px-4">Aadhaar Card</th>
                      <th className="py-3.5 px-3 text-center">Gender</th>
                      <th className="py-3.5 px-3 text-center">Category</th>
                      <th className="py-3.5 px-4">Department / Stream</th>
                      <th className="py-3.5 px-4">Subject</th>
                      <th className="py-3.5 px-4">Contact Info (Mail, Phone & Address)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
                    {deptStudents.length > 0 ? (
                      deptStudents.map((s) => {
                        const isAedp = (s.subject && s.subject.includes('AEDP')) || (s.rollNumber && s.rollNumber.includes('AEDP'));
                        const parentName = s.parentsName || (s.fatherName ? `F: ${s.fatherName}${s.motherName ? ` / M: ${s.motherName}` : ''}` : 'N/A');
                        const cleanPhoneDigits = (s.phone || '').replace(/[^0-9]/g, '');

                        return (
                          <tr key={s.id} className="hover:bg-amber-50/50 dark:hover:bg-stone-800/40 transition-colors">
                            {/* Roll Number */}
                            <td className="py-3.5 px-4 font-mono font-bold text-amber-900 dark:text-amber-400 whitespace-nowrap">
                              {s.rollNumber}
                            </td>

                            {/* Univ. Roll Number */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <input
                                type="text"
                                value={s.universityRollNumber || ''}
                                disabled={!isAdmin && !studentDirectoryEnabled}
                                readOnly={isHod && !studentDirectoryEnabled}
                                onChange={(e) => handleUpdateStudentField(s.id, 'universityRollNumber', e.target.value)}
                                placeholder={(isAdmin || studentDirectoryEnabled) ? "Enter Univ. Roll" : "Locked"}
                                className={`w-32 px-2 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:ring-1 focus:ring-amber-500 outline-none ${(!isAdmin && !studentDirectoryEnabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              />
                            </td>

                            {/* Barcode */}
                            <td className="py-3.5 px-4 font-mono text-stone-600 dark:text-stone-300 whitespace-nowrap">
                              <span className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                                {s.barcode || 'N/A'}
                              </span>
                            </td>

                            {/* Applicant Name */}
                            <td className="py-3.5 px-4 font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                  s.gender === 'Female' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                }`}>
                                  {s.name ? s.name[0] : 'U'}
                                </div>
                                <span>{s.name}</span>
                              </div>
                            </td>

                            {/* Father & Mother Name */}
                            <td className="py-3.5 px-4 text-xs font-medium text-stone-700 dark:text-stone-300 max-w-xs truncate">
                              <span title={parentName}>{parentName}</span>
                            </td>

                            {/* Aadhaar Card */}
                            <td className="py-3.5 px-4 text-xs font-mono font-bold text-stone-700 dark:text-stone-300 whitespace-nowrap">
                              <span className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700">
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

                            {/* Category */}
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

                            {/* Subject & Program */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-stone-800 dark:text-stone-200">
                                  {s.subject}
                                </span>
                                {isAedp ? (
                                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-bold uppercase rounded">
                                    AEDP
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-stone-800 dark:text-amber-300 text-[9px] font-bold uppercase rounded">
                                    REGULAR
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Contact Info */}
                            <td className="py-3.5 px-4 text-xs text-stone-600 dark:text-stone-300 whitespace-nowrap space-y-1">
                              <p className="flex items-center gap-1.5">
                                <a href={s.email ? `mailto:${s.email}` : '#'} className="hover:underline flex items-center gap-1 text-stone-600 dark:text-stone-300">
                                  <Mail className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                                  <span>{s.email}</span>
                                </a>
                              </p>
                              <p className="flex items-center gap-1.5 font-mono text-[11px]">
                                <Phone className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                                <a href={cleanPhoneDigits ? `tel:${cleanPhoneDigits}` : '#'} className="font-bold text-stone-800 dark:text-stone-200 hover:underline">
                                  {s.phone}
                                </a>
                              </p>
                              <p className="flex items-center gap-1.5 text-[11px] text-stone-500">
                                <MapPin className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                                <span className="truncate max-w-[180px]" title={s.address || 'At/Po: Bargarh, Dist: Bargarh, Odisha'}>
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
                          No student records found matching the specified filters for {activeDeptConfig.subject}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </>
      )}

      {/* 2. STUDENT ID VIEW */}
      {departmentViewMode === 'student-id' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div>
              <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                Student ID & Identity Management — {activeDeptConfig.subject}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Manage Roll No, Applicant Name, APAAR/ABC ID, My Bharat ID, and Anti-Ragging ID.
              </p>
            </div>
            {!studentIdTabEnabled && isAdmin && (
              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-xl">
                Status: DISABLED for HOD / Public
              </span>
            )}
            {!studentIdTabEnabled && isHod && !isAdmin && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-xl flex items-center gap-1">
                <Lock className="w-3 h-3" />
                View Only Mode
              </span>
            )}
          </div>

          {!studentIdTabEnabled && isHod && !isAdmin && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Editing is currently disabled by Admin. You can view all records but cannot make changes.</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-amber-50 dark:bg-stone-800 border-b border-amber-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 uppercase text-[11px] font-bold">
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4">Applicant Name</th>
                    <th className="py-3 px-4">APAAR ID / ABC ID</th>
                    <th className="py-3 px-4">My Bharat ID</th>
                    <th className="py-3 px-4">Anti-Ragging ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-medium">
                  {deptStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-500 italic">
                        No students enrolled in this department yet.
                      </td>
                    </tr>
                  ) : (
                    deptStudents.map((s) => {
                      const canEdit = isAdmin || (isHod && studentIdTabEnabled !== false);
                      return (
                        <tr key={s.id} className="hover:bg-amber-50/50 dark:hover:bg-stone-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                            {s.rollNumber || 'N/A'}
                          </td>
                          <td className="py-3 px-4 font-bold text-stone-800 dark:text-stone-200">
                            {s.name}
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              disabled={!isAdmin && !studentIdTabEnabled}
                              readOnly={isHod && !studentIdTabEnabled}
                              value={s.apaarId || ''}
                              onChange={(e) => handleUpdateStudentField(s.id, 'apaarId', e.target.value)}
                              placeholder={studentIdTabEnabled ? "Enter APAAR / ABC ID" : "Disabled"}
                              className={`w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-600 ${(!isAdmin && !studentIdTabEnabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              disabled={!isAdmin && !studentIdTabEnabled}
                              readOnly={isHod && !studentIdTabEnabled}
                              value={s.myBharatId || ''}
                              onChange={(e) => handleUpdateStudentField(s.id, 'myBharatId', e.target.value)}
                              placeholder={studentIdTabEnabled ? "Enter My Bharat ID" : "Disabled"}
                              className={`w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-600 ${(!isAdmin && !studentIdTabEnabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              disabled={!isAdmin && !studentIdTabEnabled}
                              readOnly={isHod && !studentIdTabEnabled}
                              value={s.antiRaggingId || ''}
                              onChange={(e) => handleUpdateStudentField(s.id, 'antiRaggingId', e.target.value)}
                              placeholder={studentIdTabEnabled ? "Enter Anti-Ragging ID" : "Disabled"}
                              className={`w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-600 ${(!isAdmin && !studentIdTabEnabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. SUBJECT COUNSELLING VIEW */}
      {departmentViewMode === 'subject-counselling' && (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div>
              <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                Subject Counselling Allocation — {activeDeptConfig.subject}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Manage course counselling allocations for NEP and AEDP programs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 mr-2">
                <button
                  onClick={exportCounsellingExcel}
                  className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl transition-colors title='Export to Excel'"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button
                  onClick={exportCounsellingPDF}
                  className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-colors title='Export to PDF'"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1 bg-amber-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setCounsellingCourseType('regular')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${counsellingCourseType === 'regular' ? 'bg-amber-700 text-white shadow-sm' : 'text-stone-700 dark:text-stone-300'}`}
                >
                  NEP Subject Counselling
                </button>
                <button
                  onClick={() => setCounsellingCourseType('aedp')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${counsellingCourseType === 'aedp' ? 'bg-amber-700 text-white shadow-sm' : 'text-stone-700 dark:text-stone-300'}`}
                >
                  AEDP Course Counselling
                </button>
              </div>
              {!subjectCounsellingTabEnabled && isAdmin && (
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-xl">
                  Status: DISABLED for HOD / Public
                </span>
              )}
              {!subjectCounsellingTabEnabled && isHod && !isAdmin && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-xl flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  View Only Mode
                </span>
              )}
            </div>
          </div>

          {!subjectCounsellingTabEnabled && isHod && !isAdmin && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Editing is currently disabled by Admin. You can view counselling allocations but cannot make changes.</span>
            </div>
          )}

          <div className="overflow-x-auto">
              {counsellingCourseType === 'regular' ? (
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-amber-50 dark:bg-stone-800 border-b border-amber-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 uppercase text-[11px] font-bold">
                      <th className="py-3 px-3">Roll Number</th>
                      <th className="py-3 px-3">Applicant Name</th>
                      <th className="py-3 px-3">Major</th>
                      <th className="py-3 px-3">Minor 1</th>
                      <th className="py-3 px-3">Minor 2</th>
                      <th className="py-3 px-3">AEC</th>
                      <th className="py-3 px-3">SEC</th>
                      <th className="py-3 px-3">MDC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-medium">
                    {regularCounsellingStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-stone-500 italic">
                          No NEP (Regular) students found for this department.
                        </td>
                      </tr>
                    ) : (
                      regularCounsellingStudents.map((s) => {
                        const canEdit = isAdmin || (isHod && subjectCounsellingTabEnabled !== false);
                        return (
                          <tr key={s.id} className="hover:bg-amber-50/50 dark:hover:bg-stone-800/40 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">{s.rollNumber || 'N/A'}</td>
                            <td className="py-3 px-3 font-bold text-stone-800 dark:text-stone-200">{s.name}</td>
                            <td className="py-3 px-3">
                              <input 
                                type="text" 
                                readOnly={true} 
                                value={s.counsellingMajor || s.subject || ''} 
                                placeholder="Major (Read Only)" 
                                className="w-24 px-2 py-1 bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none opacity-80 cursor-not-allowed text-stone-500" 
                              />
                            </td>
                            <td className="py-3 px-3">
                              <input type="text" disabled={!canEdit} value={s.counsellingMinor1 || ''} onChange={(e) => handleUpdateStudentField(s.id, 'counsellingMinor1', e.target.value)} placeholder="Minor 1" className="w-24 px-2 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-75" />
                            </td>
                            <td className="py-3 px-3">
                              <input type="text" disabled={!canEdit} value={s.counsellingMinor2 || ''} onChange={(e) => handleUpdateStudentField(s.id, 'counsellingMinor2', e.target.value)} placeholder="Minor 2" className="w-24 px-2 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-75" />
                            </td>
                            <td className="py-3 px-3">
                              <input type="text" disabled={!canEdit} value={s.counsellingAec || ''} onChange={(e) => handleUpdateStudentField(s.id, 'counsellingAec', e.target.value)} placeholder="AEC" className="w-20 px-2 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-75" />
                            </td>
                            <td className="py-3 px-3">
                              <input type="text" disabled={!canEdit} value={s.counsellingSec || ''} onChange={(e) => handleUpdateStudentField(s.id, 'counsellingSec', e.target.value)} placeholder="SEC" className="w-20 px-2 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-75" />
                            </td>
                            <td className="py-3 px-3">
                              <input type="text" disabled={!canEdit} value={s.counsellingMdc || ''} onChange={(e) => handleUpdateStudentField(s.id, 'counsellingMdc', e.target.value)} placeholder="MDC" className="w-20 px-2 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-75" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-emerald-50 dark:bg-stone-800 border-b border-emerald-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 uppercase text-[11px] font-bold">
                      <th className="py-3 px-3">Roll Number</th>
                      <th className="py-3 px-3">Applicant Name</th>
                      <th className="py-3 px-3">Major 1</th>
                      <th className="py-3 px-3">Major 2</th>
                      <th className="py-3 px-3">MDC 1</th>
                      <th className="py-3 px-3">MDC 2</th>
                      <th className="py-3 px-3">SEC 1</th>
                      <th className="py-3 px-3">SEC 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-medium">
                    {aedpCounsellingStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-stone-500 italic">
                          No AEDP students found for this department.
                        </td>
                      </tr>
                    ) : (
                      aedpCounsellingStudents.map((s) => {
                        const canEdit = isAdmin || (isHod && subjectCounsellingTabEnabled !== false);
                        return (
                          <tr key={s.id} className="hover:bg-amber-50/50 dark:hover:bg-stone-800/40 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">{s.rollNumber || 'N/A'}</td>
                            <td className="py-3 px-3 font-bold text-stone-800 dark:text-stone-200">{s.name}</td>
                            <td className="py-3 px-3">
                              <input 
                                type="text" 
                                readOnly={true} 
                                value={s.counsellingAedpMajor1 || s.subject || ''} 
                                placeholder="Major 1 (Read Only)" 
                                className="w-24 px-2 py-1 bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none opacity-80 cursor-not-allowed text-stone-500" 
                              />
                            </td>
                            <td className="py-3 px-3">
                              <input 
                                type="text" 
                                readOnly={true} 
                                value={s.counsellingAedpMajor2 || deptIntakeSummary.regularCourseName || activeDeptConfig.subject || ''} 
                                placeholder="Major 2 (Read Only)" 
                                className="w-24 px-2 py-1 bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none opacity-80 cursor-not-allowed text-stone-500" 
                              />
                            </td>
                            <td className="py-3 px-3">
                              <input type="text" disabled={!canEdit} value={s.counsellingAedpMdc1 || ''} onChange={(e) => handleUpdateStudentField(s.id, 'counsellingAedpMdc1', e.target.value)} placeholder="MDC 1" className="w-20 px-2 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-75" />
                            </td>
                            <td className="py-3 px-3">
                              <input type="text" disabled={!canEdit} value={s.counsellingAedpMdc2 || ''} onChange={(e) => handleUpdateStudentField(s.id, 'counsellingAedpMdc2', e.target.value)} placeholder="MDC 2" className="w-20 px-2 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-75" />
                            </td>
                            <td className="py-3 px-3">
                              <input type="text" disabled={!canEdit} value={s.counsellingAedpSec1 || ''} onChange={(e) => handleUpdateStudentField(s.id, 'counsellingAedpSec1', e.target.value)} placeholder="SEC 1" className="w-20 px-2 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-75" />
                            </td>
                            <td className="py-3 px-3">
                              <input type="text" disabled={!canEdit} value={s.counsellingAedpSec2 || ''} onChange={(e) => handleUpdateStudentField(s.id, 'counsellingAedpSec2', e.target.value)} placeholder="SEC 2" className="w-20 px-2 py-1 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-75" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    )}

    {/* EDIT STUDENT MODAL (For HOD & Admin) */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-amber-200 dark:border-stone-800 overflow-hidden my-8">
            <div className="bg-gradient-to-r from-amber-700 to-orange-800 p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                  HOD Student Record Editor
                </span>
                <h3 className="text-xl font-serif font-bold mt-1">
                  Edit Student: {editingStudent.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 text-xs sm:text-sm">
              {studentFormSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{studentFormSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Applicant Name</label>
                  <input
                    type="text"
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={editingStudent.rollNumber}
                    onChange={(e) => setEditingStudent({ ...editingStudent, rollNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Barcode Number</label>
                  <input
                    type="text"
                    value={editingStudent.barcode}
                    onChange={(e) => setEditingStudent({ ...editingStudent, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Gender</label>
                  <select
                    value={editingStudent.gender}
                    onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as 'Female' | 'Male' })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Father Name</label>
                  <input
                    type="text"
                    value={editingStudent.fatherName || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, fatherName: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Mother Name</label>
                  <input
                    type="text"
                    value={editingStudent.motherName || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, motherName: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Aadhaar Card (UID)</label>
                  <input
                    type="text"
                    value={editingStudent.aadhaarCard || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, aadhaarCard: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Category (GEN/SC/ST/SEBC/OBC)</label>
                  <select
                    value={editingStudent.category || 'GEN'}
                    onChange={(e) => setEditingStudent({ ...editingStudent, category: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono font-bold"
                  >
                    <option value="GEN">GEN (General)</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="SEBC">SEBC</option>
                    <option value="OBC">OBC</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Department / Stream</label>
                  <input
                    type="text"
                    value={editingStudent.stream || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, stream: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={editingStudent.phone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Email ID</label>
                  <input
                    type="email"
                    value={editingStudent.email}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold uppercase text-stone-600 dark:text-stone-400 mb-1">Address in Contact Info</label>
                  <input
                    type="text"
                    value={editingStudent.address || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, address: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-800 dark:text-stone-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT HOD ACCOUNT & PASSWORD MODAL (Super Admin Only) */}
      {editingHod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-amber-200 dark:border-stone-800 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-orange-800 p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-0.5 rounded-full">
                  Super Admin Security Controls
                </span>
                <h3 className="text-xl font-serif font-bold mt-1">
                  Manage Account: <span className="font-mono text-amber-200">{editingHod.id}</span>
                </h3>
              </div>
              <button
                onClick={() => setEditingHod(null)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPassword} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="bg-amber-50 dark:bg-stone-800/60 p-3 rounded-2xl border border-amber-200 dark:border-stone-700 text-stone-700 dark:text-stone-300">
                <p className="font-semibold text-stone-900 dark:text-stone-100">
                  {editingHod.courseName || editingHod.subjectName}
                </p>
                <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                  ID: {editingHod.id} | Department: {editingHod.deptId}
                </p>
              </div>

              <div>
                <label className="block font-bold uppercase text-stone-700 dark:text-stone-300 mb-1">
                  Head of Department (HOD) Name
                </label>
                <input
                  type="text"
                  value={editingHodName}
                  onChange={(e) => setEditingHodName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-medium text-stone-900 dark:text-stone-100"
                  placeholder="e.g. Dr. B. K. Sahu"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-stone-700 dark:text-stone-300 mb-1">
                  Official HOD Email Address
                </label>
                <input
                  type="email"
                  value={editingHodEmail}
                  onChange={(e) => setEditingHodEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono text-stone-900 dark:text-stone-100"
                  placeholder="e.g. hod.subject@samspanchayat.edu.in"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-stone-700 dark:text-stone-300 mb-1">
                  Security Password (Min 6 Characters)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono text-amber-900 dark:text-amber-300 font-bold"
                    placeholder="Enter new password..."
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAndSetRandomPass}
                    className="px-3.5 py-2.5 bg-amber-100 dark:bg-stone-800 hover:bg-amber-200 text-amber-900 dark:text-amber-300 rounded-xl font-bold shrink-0 text-xs flex items-center gap-1 border border-amber-300 dark:border-stone-700 transition-colors"
                    title="Generate random 8-character secure password"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Random</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between gap-3 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    const defaultAcc = DEFAULT_HOD_ACCOUNTS.find(a => a.id === editingHod.id);
                    if (defaultAcc) {
                      setNewPasswordInput(defaultAcc.password);
                    }
                  }}
                  className="text-amber-800 dark:text-amber-400 hover:underline text-xs font-semibold"
                >
                  Reset Default Password
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingHod(null)}
                    className="px-4 py-2 bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-xl font-semibold hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Account Credentials</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
