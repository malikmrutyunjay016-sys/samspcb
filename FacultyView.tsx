import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Mail, 
  Phone, 
  Award, 
  Plus, 
  Edit3, 
  Trash2, 
  Lock, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Building2, 
  UserCheck, 
  ShieldCheck,
  Briefcase,
  Layers,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Faculty, Student, Department } from '../types';
import { 
  getSavedSanctionedSeats, 
  getDepartmentIntakeSummary 
} from '../utils/sanctionedSeatsService';

interface FacultyViewProps {
  faculty: Faculty[];
  students?: Student[];
  departments?: Department[];
  userRole: 'admin' | 'hod' | 'student' | null;
  userInfo: { name: string; email: string; deptId?: string } | null;
  onOpenLogin: () => void;
  onAddFaculty: (newFac: Omit<Faculty, 'id'>) => Promise<void>;
  onUpdateFaculty: (updatedFac: Faculty) => Promise<void>;
  onDeleteFaculty: (facId: string) => Promise<void>;
}

const STANDARD_DEPARTMENTS = [
  'All Departments',
  'Odia',
  'English',
  'Sanskrit',
  'History',
  'Political Science',
  'Economics',
  'Philosophy',
  'Education',
  'Sociology',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Botany',
  'Zoology',
  'Computer Science',
  'Commerce',
  'Self Financing (AEDP)'
];

const FACULTY_TYPES = ['All Types', 'HOD', 'Regular Faculty', 'Guest Faculty'] as const;

export const FacultyView: React.FC<FacultyViewProps> = ({
  faculty,
  students = [],
  userRole,
  userInfo,
  onOpenLogin,
  onAddFaculty,
  onUpdateFaculty,
  onDeleteFaculty
}) => {
  const isAuthorized = userRole === 'admin' || userRole === 'hod';

  // Load sanctioned seats matrix map
  const sanctionedSeatsMap = useMemo(() => getSavedSanctionedSeats(), []);

  // Filters state
  const [selectedDept, setSelectedDept] = useState<string>('All Departments');

  // Intake capacity for currently selected department (Regular + corresponding AEDP course)
  const activeDeptSeatSummary = useMemo(() => {
    if (selectedDept === 'All Departments') return null;
    return getDepartmentIntakeSummary(selectedDept, sanctionedSeatsMap, students);
  }, [selectedDept, sanctionedSeatsMap, students]);
  const [selectedType, setSelectedType] = useState<string>('All Types');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDeptName, setFormDeptName] = useState('Odia');
  const [formCustomDept, setFormCustomDept] = useState('');
  const [formFacultyType, setFormFacultyType] = useState<'HOD' | 'Regular Faculty' | 'Guest Faculty'>('Regular Faculty');
  const [formDesignation, setFormDesignation] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formError, setFormError] = useState('');

  // Extract department names dynamically from existing faculty + standard list
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    STANDARD_DEPARTMENTS.forEach(d => {
      if (d !== 'All Departments') set.add(d);
    });
    faculty.forEach(f => {
      if (f.departmentName) {
        // Clean up prefix if any
        const cleanName = f.departmentName.replace(/^Department of /i, '').trim();
        set.add(cleanName);
      }
    });
    return ['All Departments', ...Array.from(set).sort()];
  }, [faculty]);

  // Compute helper to get effective type of a faculty record
  const getFacultyType = (f: Faculty): 'HOD' | 'Regular Faculty' | 'Guest Faculty' => {
    if (f.facultyType) return f.facultyType;
    const des = (f.designation || '').toLowerCase();
    if (des.includes('hod') || des.includes('head')) return 'HOD';
    if (des.includes('guest') || des.includes('part-time') || des.includes('contract')) return 'Guest Faculty';
    return 'Regular Faculty';
  };

  // Filtered list based on Department, Type, Search
  const filteredFaculty = useMemo(() => {
    return faculty.filter(f => {
      // Clean department name for matching
      const dept = f.departmentName ? f.departmentName.replace(/^Department of /i, '').trim() : '';
      
      // Department filter
      if (selectedDept !== 'All Departments' && dept.toLowerCase() !== selectedDept.toLowerCase() && f.departmentName !== selectedDept) {
        return false;
      }

      // Type filter
      const fType = getFacultyType(f);
      if (selectedType !== 'All Types') {
        if (selectedType === 'Regular Faculty') {
          if (fType !== 'Regular Faculty' && fType !== 'HOD') return false;
        } else if (fType !== selectedType) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = f.name.toLowerCase().includes(q);
        const emailMatch = f.email.toLowerCase().includes(q);
        const phoneMatch = f.phone.toLowerCase().includes(q);
        const desMatch = f.designation.toLowerCase().includes(q);
        const deptMatch = f.departmentName.toLowerCase().includes(q);
        return nameMatch || emailMatch || phoneMatch || desMatch || deptMatch;
      }

      return true;
    });
  }, [faculty, selectedDept, selectedType, searchQuery]);

  // Count stats
  const stats = useMemo(() => {
    let hodCount = 0;
    let regularCount = 0;
    let guestCount = 0;
    faculty.forEach(f => {
      const type = getFacultyType(f);
      if (type === 'HOD') {
        hodCount++;
        regularCount++; // An HOD is also a regular faculty member
      } else if (type === 'Guest Faculty') {
        guestCount++;
      } else {
        regularCount++;
      }
    });
    return { total: faculty.length, hodCount, regularCount, guestCount };
  }, [faculty]);

  // Handle open add modal
  const handleOpenAddModal = () => {
    setEditingFaculty(null);
    setFormName('');
    setFormDeptName(availableDepartments[1] || 'Odia');
    setFormCustomDept('');
    setFormFacultyType('Regular Faculty');
    setFormDesignation('Assistant Professor');
    setFormEmail('');
    setFormPhone('+91 ');
    setFormError('');
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (fac: Faculty) => {
    setEditingFaculty(fac);
    setFormName(fac.name);
    const cleanDept = fac.departmentName.replace(/^Department of /i, '').trim();
    if (availableDepartments.includes(cleanDept)) {
      setFormDeptName(cleanDept);
      setFormCustomDept('');
    } else {
      setFormDeptName('Other');
      setFormCustomDept(fac.departmentName);
    }
    setFormFacultyType(getFacultyType(fac));
    setFormDesignation(fac.designation);
    setFormEmail(fac.email);
    setFormPhone(fac.phone);
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit modal form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Faculty name is required');
      return;
    }
    if (!formEmail.trim()) {
      setFormError('Email address is required');
      return;
    }

    const finalDept = formDeptName === 'Other' ? (formCustomDept.trim() || 'General') : formDeptName;
    const deptId = `dept-${finalDept.toLowerCase().replace(/[^a-z0-0]/g, '')}`;

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingFaculty) {
        await onUpdateFaculty({
          ...editingFaculty,
          name: formName.trim(),
          departmentId: deptId,
          departmentName: finalDept,
          facultyType: formFacultyType,
          designation: formDesignation.trim() || 'Faculty Member',
          email: formEmail.trim(),
          phone: formPhone.trim()
        });
      } else {
        await onAddFaculty({
          name: formName.trim(),
          departmentId: deptId,
          departmentName: finalDept,
          facultyType: formFacultyType,
          designation: formDesignation.trim() || 'Faculty Member',
          email: formEmail.trim(),
          phone: formPhone.trim()
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save faculty record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete faculty
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the Faculty Directory?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await onDeleteFaculty(id);
    } catch (err) {
      alert('Error removing faculty record');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-orange-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Building2 className="w-4 h-4" />
              <span>SAMS Panchayat College • Academic Staff</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold">Faculty Directory Portal</h2>
            <p className="text-amber-100/90 text-sm mt-1 max-w-2xl">
              Directory of Heads of Department (HODs), regular professors, and guest faculty. Managed by authorized departmental administrators.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {isAuthorized ? (
              <button
                onClick={handleOpenAddModal}
                className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Add Faculty Member</span>
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-4 py-2.5 bg-amber-900/60 hover:bg-amber-800/80 border border-amber-500/30 text-amber-200 text-xs font-semibold rounded-2xl transition-all flex items-center gap-2 backdrop-blur-sm"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Sign in as HOD/Admin to Manage</span>
              </button>
            )}
          </div>
        </div>

        {/* Banner Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-amber-700/50">
          <div className="bg-stone-900/40 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-amber-500/20">
            <p className="text-amber-300/80 text-[11px] font-medium uppercase">Total Faculty</p>
            <p className="text-2xl font-serif font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-stone-900/40 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-amber-500/20">
            <p className="text-amber-300/80 text-[11px] font-medium uppercase">Department HODs</p>
            <p className="text-2xl font-serif font-bold text-amber-300">{stats.hodCount}</p>
          </div>
          <div className="bg-stone-900/40 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-amber-500/20">
            <p className="text-amber-300/80 text-[11px] font-medium uppercase">Regular Faculty</p>
            <p className="text-2xl font-serif font-bold text-white">{stats.regularCount}</p>
          </div>
          <div className="bg-stone-900/40 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-amber-500/20">
            <p className="text-amber-300/80 text-[11px] font-medium uppercase">Guest Faculty</p>
            <p className="text-2xl font-serif font-bold text-amber-200">{stats.guestCount}</p>
          </div>
        </div>
      </div>

      {/* Access Permission Notice for Guests vs Logged-in Staff */}
      {!isAuthorized ? (
        <div className="bg-amber-50/90 dark:bg-stone-800/80 border border-amber-200 dark:border-stone-700 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
            <p>
              <strong className="font-semibold">Public View Mode:</strong> You are browsing the official faculty list. Only verified <span className="underline decoration-amber-400 font-bold">HODs</span> and <span className="underline decoration-amber-400 font-bold">Super Admin</span> can add, edit, or remove faculty entries.
            </p>
          </div>
          <button
            onClick={onOpenLogin}
            className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl shrink-0 transition-colors"
          >
            Log In
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Authenticated as <strong className="font-bold">{userInfo?.name || userRole?.toUpperCase()}</strong>. Full management access enabled (Add, Edit, Remove Faculty).
            </span>
          </div>
          <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-bold rounded uppercase text-[10px]">
            {userRole}
          </span>
        </div>
      )}

      {/* FILTER CONTROLS SECTION */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-amber-200 dark:border-stone-800 shadow-md space-y-6">
        
        {/* Search & Header */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">Filter Academic Directory</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Select department tab or faculty type to narrow down search</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by name, designation, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl text-xs text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: Faculty Category / Type Tabs (HOD / Regular Faculty / Guest Faculty) */}
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
            1. Choose Faculty Designation / Type:
          </label>
          <div className="flex flex-wrap gap-2">
            {FACULTY_TYPES.map((type) => {
              const isActive = selectedType === type;
              let count = 0;
              if (type === 'All Types') count = faculty.length;
              else if (type === 'HOD') count = stats.hodCount;
              else if (type === 'Regular Faculty') count = stats.regularCount;
              else if (type === 'Guest Faculty') count = stats.guestCount;

              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-amber-800 text-white shadow-md'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-amber-100 dark:hover:bg-stone-700'
                  }`}
                >
                  {type === 'HOD' && <Award className="w-3.5 h-3.5 text-amber-300" />}
                  {type === 'Regular Faculty' && <UserCheck className="w-3.5 h-3.5" />}
                  {type === 'Guest Faculty' && <Briefcase className="w-3.5 h-3.5" />}
                  <span>{type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-amber-900 text-amber-200' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 2: Department Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
            2. Choose Department:
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-200">
            {availableDepartments.map((dept) => {
              const isActive = selectedDept === dept;
              // calculate count for this department
              const deptCount = dept === 'All Departments' 
                ? faculty.length 
                : faculty.filter(f => {
                    const clean = f.departmentName ? f.departmentName.replace(/^Department of /i, '').trim() : '';
                    return clean.toLowerCase() === dept.toLowerCase() || f.departmentName === dept;
                  }).length;

              return (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-700 to-orange-700 text-white shadow-sm font-semibold'
                      : 'bg-stone-50 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-stone-800 border border-stone-200/60 dark:border-stone-700/60'
                  }`}
                >
                  <span>{dept}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                    isActive ? 'bg-amber-900/60 text-amber-100' : 'bg-stone-200/70 dark:bg-stone-700/70 text-stone-600 dark:text-stone-400'
                  }`}>
                    {deptCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DEPARTMENT INTAKE CAPACITY CARD (Synchronized from Subjects & Seat Matrix) */}
        {activeDeptSeatSummary && (
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 bg-amber-50/50 dark:bg-stone-850 p-5 rounded-2xl border border-amber-200/80 dark:border-stone-700/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 rounded-full text-[11px] font-bold">
                  <Layers className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>Synchronized from Subjects & Seat Matrix</span>
                </div>
                <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                  {selectedDept} Department Intake Capacity
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Includes Regular Honours + Corresponding AEDP course capacity for {selectedDept}.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white dark:bg-stone-900 p-3 rounded-xl border border-amber-200 dark:border-stone-700 text-xs font-mono font-bold shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block font-sans">Total Department Intake</span>
                  <span className="text-amber-900 dark:text-amber-400 text-base">{activeDeptSeatSummary.totalIntakeCapacity} Seats</span>
                </div>
                <div className="h-8 w-px bg-stone-200 dark:bg-stone-700" />
                <div>
                  <span className="text-[10px] text-stone-400 block font-sans">Enrolled Students</span>
                  <span className="text-emerald-700 dark:text-emerald-400 text-base">{activeDeptSeatSummary.totalEnrolled} / {activeDeptSeatSummary.totalIntakeCapacity}</span>
                </div>
              </div>
            </div>

            {/* Course Breakdown Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              {/* Regular Course Box */}
              <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-sans font-bold uppercase text-stone-500 block">Regular Course</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{activeDeptSeatSummary.regularCourseName}</span>
                </div>
                <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-bold rounded-lg text-xs">
                  {activeDeptSeatSummary.regularSanctioned} Seats ({activeDeptSeatSummary.regularEnrolled} Admitted)
                </span>
              </div>

              {/* AEDP Course Box */}
              <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-sans font-bold uppercase text-stone-500 block">AEDP Program</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {activeDeptSeatSummary.aedpCourseName || 'No AEDP Course'}
                  </span>
                </div>
                {activeDeptSeatSummary.aedpCourseName ? (
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-bold rounded-lg text-xs">
                    {activeDeptSeatSummary.aedpSanctioned} Seats ({activeDeptSeatSummary.aedpEnrolled} Admitted)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-400 font-bold rounded-lg text-xs">
                    0 AEDP Seats
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* FACULTY CARDS GRID */}
      {filteredFaculty.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 border border-amber-200 dark:border-stone-800 shadow-sm text-center space-y-3">
          <Users className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto" />
          <h3 className="text-lg font-serif font-bold text-stone-800 dark:text-stone-200">No Faculty Found</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            No academic staff match the selected criteria ({selectedDept} • {selectedType}).
          </p>
          {isAuthorized && (
            <button
              onClick={handleOpenAddModal}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Faculty Member for {selectedDept !== 'All Departments' ? selectedDept : 'Department'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFaculty.map((f) => {
            const fType = getFacultyType(f);
            const isDeleting = deletingId === f.id;

            return (
              <div 
                key={f.id} 
                className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-amber-200 dark:border-stone-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between relative group"
              >
                <div>
                  {/* Top Bar on Card */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md ${
                        fType === 'HOD'
                          ? 'bg-gradient-to-br from-amber-700 to-orange-800'
                          : fType === 'Guest Faculty'
                          ? 'bg-gradient-to-br from-stone-600 to-stone-800'
                          : 'bg-gradient-to-br from-amber-600 to-amber-800'
                      }`}>
                        {f.name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/i, '')[0] || 'F'}
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-base leading-snug">
                          {f.name}
                        </h3>
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mt-0.5">
                          {f.designation}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons if logged in */}
                    {isAuthorized && (
                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal(f)}
                          title="Edit Faculty Record"
                          className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-stone-800 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id, f.name)}
                          disabled={isDeleting}
                          title="Remove Faculty Member"
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-stone-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Type Badge & Department */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="px-3 py-1 bg-amber-100/80 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold">
                      Department of {f.departmentName.replace(/^Department of /i, '')}
                    </span>

                    {fType === 'HOD' ? (
                      <>
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-amber-700 text-white shadow-sm">
                          HOD
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-stone-700">
                          Regular Faculty
                        </span>
                      </>
                    ) : fType === 'Guest Faculty' ? (
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200">
                        Guest Faculty
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-stone-700">
                        Regular Faculty
                      </span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300 border-t border-stone-100 dark:border-stone-800 pt-4">
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="w-4 h-4 text-amber-700 shrink-0" />
                      <a href={`mailto:${f.email}`} className="hover:underline truncate">{f.email}</a>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-amber-700 shrink-0" />
                      <a href={`tel:${f.phone}`} className="hover:underline">{f.phone}</a>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT FACULTY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6">
            
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center font-bold">
                  {editingFaculty ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                    {editingFaculty ? 'Edit Faculty Record' : 'Add New Faculty Member'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {editingFaculty ? 'Modify staff details in directory' : 'Register a new professor or guest faculty'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              
              {/* Name */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Full Name (with Prefix e.g. Dr., Prof.) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ramesh Chandra Mohapatra"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Department *
                  </label>
                  <select
                    value={formDeptName}
                    onChange={(e) => setFormDeptName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  >
                    {availableDepartments.filter(d => d !== 'All Departments').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    <option value="Other">Other / Custom</option>
                  </select>
                </div>

                {formDeptName === 'Other' && (
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                      Custom Department Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Specify department"
                      value={formCustomDept}
                      onChange={(e) => setFormCustomDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Faculty Role / Type *
                  </label>
                  <select
                    value={formFacultyType}
                    onChange={(e) => setFormFacultyType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="HOD">HOD (Head of Department)</option>
                    <option value="Regular Faculty">Regular Faculty</option>
                    <option value="Guest Faculty">Guest Faculty</option>
                  </select>
                </div>
              </div>

              {/* Designation */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Designation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Professor & HOD, Reader, Assistant Professor, Guest Lecturer"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Contact (Email & Phone) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="faculty@samspanchayat.edu.in"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 9437012345"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {isSubmitting ? 'Saving...' : editingFaculty ? 'Update Record' : 'Add Faculty'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
