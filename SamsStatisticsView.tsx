import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  Users, 
  Layers, 
  Download, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  TrendingUp, 
  Award, 
  Database,
  ArrowUpRight,
  Filter,
  FileSpreadsheet,
  X,
  Search,
  Eye,
  Info
} from 'lucide-react';
import { Student, Department } from '../types';
import { 
  getSavedSanctionedSeats, 
  ALL_SUBJECT_DEFINITIONS, 
  matchesSubjectDefinition 
} from '../utils/sanctionedSeatsService';

interface SamsStatisticsViewProps {
  students: Student[];
  departments: Department[];
  setActiveTab?: (tab: string) => void;
  userRole?: 'admin' | 'hod' | 'student' | null;
  sanctionedSeatsMap?: Record<string, number>;
}

interface DrillDownState {
  isOpen: boolean;
  title: string;
  subtitle: string;
  filterFn: (student: Student) => boolean;
}

export const SamsStatisticsView: React.FC<SamsStatisticsViewProps> = ({
  students,
  departments,
  setActiveTab,
  userRole = null,
  sanctionedSeatsMap: propsSanctionedSeats
}) => {
  const [selectedStreamFilter, setSelectedStreamFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [statsViewMode, setStatsViewMode] = useState<'numeric' | 'pie'>('numeric');

  // Interactive Drill-Down Modal State for Admin
  const [drillDownModal, setDrillDownModal] = useState<DrillDownState>({
    isOpen: false,
    title: '',
    subtitle: '',
    filterFn: () => false
  });
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  const isAdmin = userRole === 'admin';

  // Category & Stream Helper Functions
  const isCategory = (s: Student, catKey: 'GEN' | 'SC' | 'ST' | 'SEBC' | 'OBC') => {
    const c = (s.category || 'GEN').toUpperCase();
    if (catKey === 'ST') return c.includes('ST');
    if (catKey === 'SC') return c.includes('SC');
    if (catKey === 'SEBC') return c.includes('SEBC');
    if (catKey === 'OBC') return c.includes('OBC');
    return !c.includes('SC') && !c.includes('ST') && !c.includes('SEBC') && !c.includes('OBC');
  };

  const matchesStream = (s: Student, streamName: string) => {
    return s.stream === streamName || 
      (streamName === 'Arts' && (s.departmentName === 'Arts' || s.departmentName === 'Odia' || s.departmentName === 'English')) ||
      (streamName === 'Commerce' && s.departmentName === 'Commerce');
  };

  const openDrillDown = (title: string, subtitle: string, filterFn: (s: Student) => boolean) => {
    if (!isAdmin) return;
    setModalSearchTerm('');
    setDrillDownModal({
      isOpen: true,
      title,
      subtitle,
      filterFn
    });
  };

  // Filtered supporting students for current active modal
  const supportingStudents = useMemo(() => {
    if (!drillDownModal.isOpen) return [];
    return students.filter(drillDownModal.filterFn);
  }, [students, drillDownModal]);

  const searchedSupportingStudents = useMemo(() => {
    if (!modalSearchTerm.trim()) return supportingStudents;
    const term = modalSearchTerm.toLowerCase();
    return supportingStudents.filter(s => {
      return (
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(term)) ||
        (s.barcode && s.barcode.toLowerCase().includes(term)) ||
        (s.subject && s.subject.toLowerCase().includes(term)) ||
        (s.category && s.category.toLowerCase().includes(term)) ||
        (s.phone && s.phone.includes(term))
      );
    });
  }, [supportingStudents, modalSearchTerm]);

  // Export Modal Supporting Students CSV
  const exportModalCSV = () => {
    const headers = [
      'Sl No',
      'Roll Number',
      'Barcode Number',
      'Student Name',
      'Father/Parent Name',
      'Gender',
      'Category',
      'Stream / Department',
      'Subject',
      'Phone Number',
      'Email'
    ];

    const rows = searchedSupportingStudents.map((s, idx) => [
      idx + 1,
      `"${s.rollNumber || ''}"`,
      `"${s.barcode || ''}"`,
      `"${s.name || ''}"`,
      `"${s.fatherName || s.motherName || s.parentsName || ''}"`,
      `"${s.gender || ''}"`,
      `"${s.category || 'GEN'}"`,
      `"${s.stream || s.departmentName || ''}"`,
      `"${s.subject || ''}"`,
      `"${s.phone || ''}"`,
      `"${s.email || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Supporting_Students_${drillDownModal.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load subject sanctioned seats matrix map
  const sanctionedSeatsMap = useMemo(() => propsSanctionedSeats || getSavedSanctionedSeats(), [propsSanctionedSeats]);

  // Compute total sanctioned seats across all 28 subjects in Seat Matrix
  const totalSanctionedSeats = useMemo(() => {
    return ALL_SUBJECT_DEFINITIONS.reduce((acc, subDef) => {
      const seats = sanctionedSeatsMap[subDef.code] ?? subDef.baseStrength;
      return acc + (Number(seats) || 0);
    }, 0);
  }, [sanctionedSeatsMap]);

  // Overall Key Metrics
  const metrics = useMemo(() => {
    const totalEnrolled = students.length;
    let maleCount = 0;
    let femaleCount = 0;

    const categories: Record<string, number> = {
      GEN: 0,
      SC: 0,
      ST: 0,
      SEBC: 0,
      OBC: 0
    };

    let regularCount = 0;
    let aedpCount = 0;

    students.forEach(s => {
      if (s.gender === 'Female') femaleCount++;
      else maleCount++;

      const cat = (s.category || 'GEN').toUpperCase();
      if (cat.includes('ST')) categories.ST++;
      else if (cat.includes('SC')) categories.SC++;
      else if (cat.includes('SEBC')) categories.SEBC++;
      else if (cat.includes('OBC')) categories.OBC++;
      else categories.GEN++;

      const isAedp = (s.subject && s.subject.includes('AEDP')) || (s.rollNumber && s.rollNumber.includes('AEDP'));
      if (isAedp) aedpCount++;
      else regularCount++;
    });

    const occupancyRate = totalSanctionedSeats > 0 ? ((totalEnrolled / totalSanctionedSeats) * 100).toFixed(1) : '92.6';
    const totalVacancies = Math.max(0, totalSanctionedSeats - totalEnrolled);

    return {
      totalEnrolled,
      totalSanctionedSeats,
      totalVacancies,
      occupancyRate,
      maleCount,
      femaleCount,
      femalePercentage: totalEnrolled > 0 ? ((femaleCount / totalEnrolled) * 100).toFixed(1) : '0',
      malePercentage: totalEnrolled > 0 ? ((maleCount / totalEnrolled) * 100).toFixed(1) : '0',
      categories,
      regularCount,
      aedpCount
    };
  }, [students, totalSanctionedSeats]);

  // Stream-wise Breakdown Metrics
  const streamMetrics = useMemo(() => {
    const streamsList = ['Arts', 'Physical Science', 'Biological Science', 'Commerce', 'Self Financing'];
    
    return streamsList.map(streamName => {
      const streamStudents = students.filter(s => {
        if (selectedCategoryFilter !== 'ALL' && (s.category || 'GEN') !== selectedCategoryFilter) {
          return false;
        }
        return s.stream === streamName || 
          (streamName === 'Arts' && (s.departmentName === 'Arts' || s.departmentName === 'Odia' || s.departmentName === 'English')) ||
          (streamName === 'Commerce' && s.departmentName === 'Commerce');
      });

      const catCounts: Record<string, number> = { GEN: 0, SC: 0, ST: 0, SEBC: 0, OBC: 0 };
      let female = 0;
      let male = 0;

      streamStudents.forEach(s => {
        if (s.gender === 'Female') female++;
        else male++;
        const c = (s.category || 'GEN').toUpperCase();
        if (c.includes('ST')) catCounts.ST++;
        else if (c.includes('SC')) catCounts.SC++;
        else if (c.includes('SEBC')) catCounts.SEBC++;
        else if (c.includes('OBC')) catCounts.OBC++;
        else catCounts.GEN++;
      });

      return {
        streamName,
        enrolled: streamStudents.length,
        female,
        male,
        catCounts
      };
    });
  }, [students, selectedCategoryFilter]);

  // Social Category Quota Pie Chart Data (GEN, SC, ST, SEBC, OBC)
  const categoryPieData = useMemo(() => {
    const total = metrics.totalEnrolled || 0;
    const cats = [
      { label: 'GEN', fullTitle: 'General Quota', count: metrics.categories.GEN || 0, color: '#64748b', filter: (s: Student) => isCategory(s, 'GEN') },
      { label: 'SC', fullTitle: 'Scheduled Caste', count: metrics.categories.SC || 0, color: '#d97706', filter: (s: Student) => isCategory(s, 'SC') },
      { label: 'ST', fullTitle: 'Scheduled Tribe', count: metrics.categories.ST || 0, color: '#9333ea', filter: (s: Student) => isCategory(s, 'ST') },
      { label: 'SEBC', fullTitle: 'Socially & Ed. Backward', count: metrics.categories.SEBC || 0, color: '#ea580c', filter: (s: Student) => isCategory(s, 'SEBC') },
      { label: 'OBC', fullTitle: 'Other Backward Classes', count: metrics.categories.OBC || 0, color: '#2563eb', filter: (s: Student) => isCategory(s, 'OBC') }
    ];

    if (total === 0) {
      return {
        slices: cats.map(c => ({ ...c, pct: 0, startPct: 0, endPct: 0 })),
        gradientString: ''
      };
    }

    let accPct = 0;
    const slices = cats.map(c => {
      const pct = (c.count / total) * 100;
      const startPct = accPct;
      const endPct = accPct + pct;
      accPct = endPct;
      return {
        ...c,
        pct,
        startPct,
        endPct
      };
    });

    const activeSlices = slices.filter(s => s.pct > 0);
    const gradientString = activeSlices.length > 0
      ? activeSlices.map(s => `${s.color} ${s.startPct.toFixed(2)}% ${s.endPct.toFixed(2)}%`).join(', ')
      : '';

    return { slices, gradientString };
  }, [metrics]);

  // Subject / Department-wise Detailed Table synced strictly from Seat Matrix & Student Database
  const subjectStatsTable = useMemo(() => {
    return ALL_SUBJECT_DEFINITIONS.map(subDef => {
      const sanctioned = sanctionedSeatsMap[subDef.code] ?? subDef.baseStrength;

      const matchingStudents = students.filter(s => matchesSubjectDefinition(s.subject, subDef));

      let female = 0;
      let male = 0;
      const catCounts: Record<string, number> = { GEN: 0, SC: 0, ST: 0, SEBC: 0, OBC: 0 };

      matchingStudents.forEach(s => {
        if (s.gender === 'Female') female++;
        else male++;

        const c = (s.category || 'GEN').toUpperCase();
        if (c.includes('ST')) catCounts.ST++;
        else if (c.includes('SC')) catCounts.SC++;
        else if (c.includes('SEBC')) catCounts.SEBC++;
        else if (c.includes('OBC')) catCounts.OBC++;
        else catCounts.GEN++;
      });

      return {
        code: subDef.code,
        name: subDef.name,
        stream: subDef.stream,
        isAedp: subDef.isAedp,
        sanctioned,
        enrolled: matchingStudents.length,
        female,
        male,
        catCounts
      };
    }).filter(item => {
      const matchesStream = selectedStreamFilter === 'ALL' || item.stream === selectedStreamFilter;
      const matchesCategory = selectedCategoryFilter === 'ALL' || item.catCounts[selectedCategoryFilter] > 0;
      return matchesStream && matchesCategory;
    });
  }, [students, sanctionedSeatsMap, selectedStreamFilter, selectedCategoryFilter]);

  // Export SAMS Statistics CSV Report
  const exportStatsCSV = () => {
    const headers = [
      'Sl No',
      'Subject / Course Name',
      'Stream',
      'Sanctioned Seats',
      'Total Enrolled',
      'Vacant Seats',
      'Fill Rate (%)',
      'Female Students',
      'Male Students',
      'GEN Category',
      'SC Category',
      'ST Category',
      'SEBC Category',
      'OBC Category'
    ];

    const rows = subjectStatsTable.map((item, idx) => {
      const vacancy = Math.max(0, item.sanctioned - item.enrolled);
      const fillRate = item.sanctioned > 0 ? ((item.enrolled / item.sanctioned) * 100).toFixed(1) : '100.0';

      return [
        idx + 1,
        `"${item.name}"`,
        `"${item.stream}"`,
        item.sanctioned,
        item.enrolled,
        vacancy,
        `"${fillRate}%"`,
        item.female,
        item.male,
        item.catCounts.GEN,
        item.catCounts.SC,
        item.catCounts.ST,
        item.catCounts.SEBC,
        item.catCounts.OBC
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAMS_Admissions_Statistics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-orange-900 text-white p-6 sm:p-10 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight">
              SAMS UG e-Admission Statistics
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
              Official real-time e-admission analytics for Panchayat College, Baragada. Category reservation breakdown (SC/ST/GEN/SEBC/OBC), gender balance, stream strength, and subject occupancy rates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <button
                onClick={exportStatsCSV}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-2xl shadow-lg transition-all flex items-center gap-2 text-xs sm:text-sm transform hover:-translate-y-0.5"
              >
                <Download className="w-4 h-4" />
                <span>Export Statistics Report</span>
              </button>
            )}
            {setActiveTab && isAdmin && (
              <button
                onClick={() => setActiveTab('students')}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl backdrop-blur-sm transition-all flex items-center gap-2 text-xs sm:text-sm border border-white/20"
              >
                <Database className="w-4 h-4 text-amber-300" />
                <span>View Full Database</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* View Mode Selector Tabs: Numeric Data, Pie Chart, Bar Graph */}
      <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-900 p-1.5 rounded-2xl border border-stone-200 dark:border-stone-800 w-fit text-xs font-semibold">
        <button
          onClick={() => setStatsViewMode('numeric')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            statsViewMode === 'numeric'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Numeric Data</span>
        </button>
        <button
          onClick={() => setStatsViewMode('pie')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
            statsViewMode === 'pie'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Pie Chart</span>
        </button>
      </div>

      {statsViewMode === 'numeric' && (
        <div className="space-y-8">
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Enrolled */}
        <div 
          onClick={() => openDrillDown('All Admitted Students', 'Total enrolled student database in Panchayat College', () => true)}
          className={`bg-white dark:bg-stone-900 p-6 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-3 transition-all ${
            isAdmin ? 'hover:border-amber-500 hover:shadow-md cursor-pointer group hover:ring-2 hover:ring-amber-500/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Total Enrolled</span>
            <div className="p-2.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-2xl flex items-center gap-1">
              <Users className="w-5 h-5" />
              {isAdmin && <Eye className="w-3.5 h-3.5 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center justify-between">
              <span>{metrics.totalEnrolled}</span>
              {isAdmin && <span className="text-[10px] bg-amber-100 text-amber-900 font-sans font-bold px-2 py-0.5 rounded-full">Click to inspect</span>}
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Synchronized from SAMS</span>
            </p>
          </div>
        </div>

        {/* Card 2: Total Sanctioned Seats / Occupancy */}
        <div 
          onClick={() => openDrillDown('Admitted Students vs Sanctioned Seats', 'All currently admitted students filling college seat capacity', () => true)}
          className={`bg-white dark:bg-stone-900 p-6 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-3 transition-all ${
            isAdmin ? 'hover:border-blue-500 hover:shadow-md cursor-pointer group hover:ring-2 hover:ring-blue-500/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Seat Occupancy</span>
            <div className="p-2.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-2xl flex items-center gap-1">
              <TrendingUp className="w-5 h-5" />
              {isAdmin && <Eye className="w-3.5 h-3.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 flex items-baseline gap-2">
              <span>{metrics.occupancyRate}%</span>
              <span className="text-xs font-sans font-normal text-stone-500">
                ({metrics.totalEnrolled} / {metrics.totalSanctionedSeats})
              </span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              {metrics.totalVacancies} seats currently vacant across subjects
            </p>
          </div>
        </div>

        {/* Card 3: Gender Balance */}
        <div 
          className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Gender Ratio</span>
            <div className="p-2.5 bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 rounded-2xl">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-1">
              <span 
                onClick={() => openDrillDown('Female Students', 'List of all admitted female students', s => s.gender === 'Female')}
                className={`text-sm font-bold text-pink-700 dark:text-pink-400 p-1 rounded-lg ${
                  isAdmin ? 'hover:bg-pink-100 dark:hover:bg-pink-950 cursor-pointer underline decoration-pink-300' : ''
                }`}
                title={isAdmin ? "Click to view Female students" : undefined}
              >
                {metrics.femalePercentage}% Female ({metrics.femaleCount})
              </span>
              <span 
                onClick={() => openDrillDown('Male Students', 'List of all admitted male students', s => s.gender === 'Male')}
                className={`text-sm font-bold text-blue-700 dark:text-blue-400 p-1 rounded-lg ${
                  isAdmin ? 'hover:bg-blue-100 dark:hover:bg-blue-950 cursor-pointer underline decoration-blue-300' : ''
                }`}
                title={isAdmin ? "Click to view Male students" : undefined}
              >
                {metrics.malePercentage}% Male ({metrics.maleCount})
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {isAdmin ? 'Click female or male text to filter student list' : `${metrics.femaleCount} Female & ${metrics.maleCount} Male Students`}
            </p>
          </div>
        </div>

        {/* Card 4: Regular vs AEDP */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Course Breakdown</span>
            <div className="p-2.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-2xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center justify-between gap-2">
              <span 
                onClick={() => openDrillDown('Regular Course Students', 'Students enrolled in 20 Regular Honours courses', s => !((s.subject && s.subject.includes('AEDP')) || (s.rollNumber && s.rollNumber.includes('AEDP'))))}
                className={`p-1 rounded-lg ${isAdmin ? 'hover:bg-amber-100 dark:hover:bg-amber-950 cursor-pointer underline decoration-amber-400' : ''}`}
                title={isAdmin ? "Click to view Regular students" : undefined}
              >
                {metrics.regularCount} Regular
              </span>
              <span 
                onClick={() => openDrillDown('AEDP Course Students', 'Students enrolled in specialized AEDP Data Science & AI course', s => Boolean((s.subject && s.subject.includes('AEDP')) || (s.rollNumber && s.rollNumber.includes('AEDP'))))}
                className={`text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-1 rounded-md font-bold ${
                  isAdmin ? 'hover:bg-emerald-200 dark:hover:bg-emerald-900 cursor-pointer' : ''
                }`}
                title={isAdmin ? "Click to view AEDP students" : undefined}
              >
                {metrics.aedpCount} AEDP
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              20 Regular Honours & 1 Specialized AEDP Course
            </p>
          </div>
        </div>

      </div>

      {/* Category Reservation Breakdown (GEN / SC / ST / SEBC / OBC) - Admin Only */}
      {isAdmin && (
        <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 rounded-full text-xs font-bold mb-1">
                <Award className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>Government Reservation Policy (Admin View)</span>
              </div>
              <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                Student Category Distribution (GEN / SC / ST / SEBC / OBC)
              </h3>
            </div>
            <p className="text-xs text-stone-500 max-w-xs">
              Click any social category card to inspect the exact list of students under that reservation quota.
            </p>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            
            {/* GEN Card */}
            <div 
              onClick={() => openDrillDown('GEN (General Category) Students', 'Students admitted under General quota', s => isCategory(s, 'GEN'))}
              className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-2 transition-all hover:border-stone-500 hover:ring-2 hover:ring-stone-400/20 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-stone-700 dark:text-stone-300">GEN (General)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-stone-500" />
              </div>
              <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                <span>{metrics.categories.GEN}</span>
                <Eye className="w-4 h-4 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {metrics.totalEnrolled > 0 ? ((metrics.categories.GEN / metrics.totalEnrolled) * 100).toFixed(1) : 0}% of Total
              </p>
            </div>

            {/* SC Card */}
            <div 
              onClick={() => openDrillDown('SC (Scheduled Caste) Students', 'Students admitted under Scheduled Caste reservation quota', s => isCategory(s, 'SC'))}
              className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2 transition-all hover:border-amber-500 hover:ring-2 hover:ring-amber-500/20 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-amber-900 dark:text-amber-300">SC (Caste)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              </div>
              <div className="text-2xl font-serif font-bold text-amber-950 dark:text-amber-100 flex items-center justify-between">
                <span>{metrics.categories.SC}</span>
                <Eye className="w-4 h-4 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                {metrics.totalEnrolled > 0 ? ((metrics.categories.SC / metrics.totalEnrolled) * 100).toFixed(1) : 0}% of Total
              </p>
            </div>

            {/* ST Card */}
            <div 
              onClick={() => openDrillDown('ST (Scheduled Tribe) Students', 'Students admitted under Scheduled Tribe reservation quota', s => isCategory(s, 'ST'))}
              className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-2 transition-all hover:border-purple-500 hover:ring-2 hover:ring-purple-500/20 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-purple-900 dark:text-purple-300">ST (Tribe)</span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              </div>
              <div className="text-2xl font-serif font-bold text-purple-950 dark:text-purple-100 flex items-center justify-between">
                <span>{metrics.categories.ST}</span>
                <Eye className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-purple-800 dark:text-purple-300">
                {metrics.totalEnrolled > 0 ? ((metrics.categories.ST / metrics.totalEnrolled) * 100).toFixed(1) : 0}% of Total
              </p>
            </div>

            {/* SEBC Card */}
            <div 
              onClick={() => openDrillDown('SEBC Category Students', 'Students admitted under Socially and Educationally Backward Classes quota', s => isCategory(s, 'SEBC'))}
              className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 space-y-2 transition-all hover:border-orange-500 hover:ring-2 hover:ring-orange-500/20 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-orange-900 dark:text-orange-300">SEBC</span>
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
              </div>
              <div className="text-2xl font-serif font-bold text-orange-950 dark:text-orange-100 flex items-center justify-between">
                <span>{metrics.categories.SEBC}</span>
                <Eye className="w-4 h-4 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-orange-800 dark:text-orange-300">
                {metrics.totalEnrolled > 0 ? ((metrics.categories.SEBC / metrics.totalEnrolled) * 100).toFixed(1) : 0}% of Total
              </p>
            </div>

            {/* OBC Card */}
            <div 
              onClick={() => openDrillDown('OBC Category Students', 'Students admitted under Other Backward Classes quota', s => isCategory(s, 'OBC'))}
              className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2 col-span-2 sm:col-span-1 transition-all hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-indigo-900 dark:text-indigo-300">OBC</span>
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              </div>
              <div className="text-2xl font-serif font-bold text-indigo-950 dark:text-indigo-100 flex items-center justify-between">
                <span>{metrics.categories.OBC}</span>
                <Eye className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                {metrics.totalEnrolled > 0 ? ((metrics.categories.OBC / metrics.totalEnrolled) * 100).toFixed(1) : 0}% of Total
              </p>
            </div>

          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-300">
              <span>Social Category Stack</span>
              <span>100% Admitted Students Breakdown</span>
            </div>
            <div className="h-4 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden flex">
              {metrics.totalEnrolled > 0 && (
                <>
                  <div
                    style={{ width: `${(metrics.categories.GEN / metrics.totalEnrolled) * 100}%` }}
                    className="bg-stone-500 h-full cursor-pointer hover:opacity-80 transition-opacity"
                    title={`GEN: ${metrics.categories.GEN}`}
                    onClick={() => openDrillDown('GEN (General Category) Students', 'Students admitted under General quota', s => isCategory(s, 'GEN'))}
                  />
                  <div
                    style={{ width: `${(metrics.categories.SC / metrics.totalEnrolled) * 100}%` }}
                    className="bg-amber-600 h-full cursor-pointer hover:opacity-80 transition-opacity"
                    title={`SC: ${metrics.categories.SC}`}
                    onClick={() => openDrillDown('SC (Scheduled Caste) Students', 'Students admitted under SC quota', s => isCategory(s, 'SC'))}
                  />
                  <div
                    style={{ width: `${(metrics.categories.ST / metrics.totalEnrolled) * 100}%` }}
                    className="bg-purple-600 h-full cursor-pointer hover:opacity-80 transition-opacity"
                    title={`ST: ${metrics.categories.ST}`}
                    onClick={() => openDrillDown('ST (Scheduled Tribe) Students', 'Students admitted under ST quota', s => isCategory(s, 'ST'))}
                  />
                  <div
                    style={{ width: `${(metrics.categories.SEBC / metrics.totalEnrolled) * 100}%` }}
                    className="bg-orange-600 h-full cursor-pointer hover:opacity-80 transition-opacity"
                    title={`SEBC: ${metrics.categories.SEBC}`}
                    onClick={() => openDrillDown('SEBC Category Students', 'Students admitted under SEBC quota', s => isCategory(s, 'SEBC'))}
                  />
                  <div
                    style={{ width: `${(metrics.categories.OBC / metrics.totalEnrolled) * 100}%` }}
                    className="bg-indigo-600 h-full cursor-pointer hover:opacity-80 transition-opacity"
                    title={`OBC: ${metrics.categories.OBC}`}
                    onClick={() => openDrillDown('OBC Category Students', 'Students admitted under OBC quota', s => isCategory(s, 'OBC'))}
                  />
                </>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Stream Wise Category & Strength Matrix */}
      <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 rounded-full text-xs font-bold mb-1">
              <Building2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Stream Strength Breakdown</span>
            </div>
            <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
              Admission Strength & Category Matrix by Stream
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-500 font-medium">Filter Category:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-semibold text-stone-800 dark:text-stone-200"
            >
              <option value="ALL">All Categories</option>
              <option value="GEN">GEN</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="SEBC">SEBC</option>
              <option value="OBC">OBC</option>
            </select>
          </div>
        </div>

        {/* Stream Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {streamMetrics.map((sm) => (
            <div 
              key={sm.streamName} 
              className={`p-5 rounded-2xl bg-stone-50/80 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3 transition-all ${
                isAdmin ? 'hover:border-amber-500 hover:shadow-md' : ''
              }`}
            >
              <div className="font-bold text-stone-900 dark:text-stone-100 text-sm truncate flex items-center justify-between" title={sm.streamName}>
                <span>{sm.streamName}</span>
                {isAdmin && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
              </div>

              <div 
                onClick={() => openDrillDown(`${sm.streamName} Stream Students`, `Students enrolled in ${sm.streamName} stream`, s => matchesStream(s, sm.streamName))}
                className={`flex items-baseline justify-between border-b border-stone-200 dark:border-stone-700 pb-2 ${
                  isAdmin ? 'cursor-pointer hover:text-amber-600 transition-colors' : ''
                }`}
                title={isAdmin ? `Click to view all ${sm.streamName} students` : undefined}
              >
                <span className="text-2xl font-serif font-bold text-amber-900 dark:text-amber-400">
                  {sm.enrolled}
                </span>
                <span className="text-xs font-medium text-stone-500">
                  {isAdmin ? 'Click to inspect' : 'Students'}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-stone-600 dark:text-stone-300">
                  <span>Female / Male:</span>
                  <span className="font-bold">
                    <span 
                      onClick={() => openDrillDown(`${sm.streamName} - Female Students`, `Female students in ${sm.streamName} stream`, s => matchesStream(s, sm.streamName) && s.gender === 'Female')}
                      className={isAdmin ? 'cursor-pointer text-pink-700 hover:underline' : ''}
                    >
                      {sm.female} F
                    </span>
                    {' / '}
                    <span 
                      onClick={() => openDrillDown(`${sm.streamName} - Male Students`, `Male students in ${sm.streamName} stream`, s => matchesStream(s, sm.streamName) && s.gender === 'Male')}
                      className={isAdmin ? 'cursor-pointer text-blue-700 hover:underline' : ''}
                    >
                      {sm.male} M
                    </span>
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400 text-[11px] pt-1">
                  <span 
                    onClick={() => openDrillDown(`${sm.streamName} - GEN Category`, `GEN category students in ${sm.streamName}`, s => matchesStream(s, sm.streamName) && isCategory(s, 'GEN'))}
                    className={isAdmin ? 'cursor-pointer hover:font-bold hover:text-stone-900' : ''}
                  >
                    GEN: {sm.catCounts.GEN}
                  </span>
                  <span 
                    onClick={() => openDrillDown(`${sm.streamName} - OBC Category`, `OBC category students in ${sm.streamName}`, s => matchesStream(s, sm.streamName) && isCategory(s, 'OBC'))}
                    className={isAdmin ? 'cursor-pointer hover:font-bold hover:text-indigo-700' : ''}
                  >
                    OBC: {sm.catCounts.OBC}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 dark:text-stone-400 text-[11px]">
                  <span 
                    onClick={() => openDrillDown(`${sm.streamName} - SC Category`, `SC category students in ${sm.streamName}`, s => matchesStream(s, sm.streamName) && isCategory(s, 'SC'))}
                    className={isAdmin ? 'cursor-pointer hover:font-bold hover:text-amber-700' : ''}
                  >
                    SC: {sm.catCounts.SC}
                  </span>
                  <span 
                    onClick={() => openDrillDown(`${sm.streamName} - ST Category`, `ST category students in ${sm.streamName}`, s => matchesStream(s, sm.streamName) && isCategory(s, 'ST'))}
                    className={isAdmin ? 'cursor-pointer hover:font-bold hover:text-purple-700' : ''}
                  >
                    ST: {sm.catCounts.ST}
                  </span>
                  <span 
                    onClick={() => openDrillDown(`${sm.streamName} - SEBC Category`, `SEBC category students in ${sm.streamName}`, s => matchesStream(s, sm.streamName) && isCategory(s, 'SEBC'))}
                    className={isAdmin ? 'cursor-pointer hover:font-bold hover:text-orange-700' : ''}
                  >
                    SEBC: {sm.catCounts.SEBC}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Subject / Department Wise Table */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 rounded-full text-xs font-bold mb-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Subject Wise Seat & Category Analytics</span>
            </div>
            <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
              Subject Wise Admissions & Reservation Breakdown
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Stream Selector */}
            <select
              value={selectedStreamFilter}
              onChange={(e) => setSelectedStreamFilter(e.target.value)}
              className="px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200"
            >
              <option value="ALL">All Streams ({subjectStatsTable.length})</option>
              <option value="Arts">Arts</option>
              <option value="Commerce">Commerce</option>
              <option value="Biological Science">Biological Science</option>
              <option value="Physical Science">Physical Science</option>
              <option value="Self Financing">Self Financing</option>
            </select>

            {/* Category Selector - Admin Only */}
            {isAdmin && (
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200"
              >
                <option value="ALL">All Categories</option>
                <option value="GEN">GEN Only</option>
                <option value="SC">SC Only</option>
                <option value="ST">ST Only</option>
                <option value="SEBC">SEBC Only</option>
                <option value="OBC">OBC Only</option>
              </select>
            )}
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-amber-50/90 dark:bg-stone-800/90 border-b border-amber-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3.5 px-4">Subject Name</th>
                <th className="py-3.5 px-4">Stream</th>
                <th className="py-3.5 px-3 text-center">Sanctioned Seats</th>
                <th className="py-3.5 px-3 text-center">Enrolled</th>
                <th className="py-3.5 px-3 text-center">Vacancy</th>
                <th className="py-3.5 px-3 text-center">Fill Rate</th>
                <th className="py-3.5 px-3 text-center">Female / Male</th>
                {isAdmin && <th className="py-3.5 px-4">Category Breakdown (GEN / SC / ST / SEBC / OBC)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
              {subjectStatsTable.length > 0 ? (
                subjectStatsTable.map((item) => {
                  const vacancy = Math.max(0, item.sanctioned - item.enrolled);
                  const fillRate = item.sanctioned > 0 ? Math.min(100, Math.round((item.enrolled / item.sanctioned) * 100)) : 100;

                  const subDefObj = ALL_SUBJECT_DEFINITIONS.find(sd => sd.name === item.name || sd.code === item.code);

                  return (
                    <tr key={item.name} className="hover:bg-amber-50/50 dark:hover:bg-stone-800/50 transition-colors">
                      
                      {/* Subject Name */}
                      <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                        <div 
                          onClick={() => {
                            if (subDefObj && isAdmin) {
                              openDrillDown(`${item.name} Enrolled Students`, `List of students admitted in ${item.name}`, s => matchesSubjectDefinition(s.subject, subDefObj));
                            }
                          }}
                          className={`flex items-center gap-2 ${isAdmin ? 'cursor-pointer hover:text-amber-600' : ''}`}
                          title={isAdmin ? `Click to view all ${item.name} students` : undefined}
                        >
                          <span>{item.name}</span>
                          {item.name.includes('AEDP') && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-bold uppercase rounded">
                              AEDP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stream */}
                      <td className="py-3.5 px-4 text-xs font-medium text-stone-600 dark:text-stone-300 whitespace-nowrap">
                        {item.stream}
                      </td>

                      {/* Sanctioned Seats */}
                      <td className="py-3.5 px-3 text-center font-bold text-stone-800 dark:text-stone-200 font-mono">
                        {item.sanctioned}
                      </td>

                      {/* Enrolled */}
                      <td 
                        onClick={() => {
                          if (subDefObj && isAdmin) {
                            openDrillDown(`${item.name} Enrolled Students`, `List of students admitted in ${item.name}`, s => matchesSubjectDefinition(s.subject, subDefObj));
                          }
                        }}
                        className={`py-3.5 px-3 text-center font-bold font-mono text-amber-900 dark:text-amber-400 ${
                          isAdmin ? 'cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950 rounded' : ''
                        }`}
                        title={isAdmin ? "Click to inspect students" : undefined}
                      >
                        {item.enrolled}
                      </td>

                      {/* Vacancy */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          vacancy === 0 
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {vacancy === 0 ? 'FULL' : `${vacancy} Vacant`}
                        </span>
                      </td>

                      {/* Fill Rate % Progress */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-bold font-mono text-xs">{fillRate}%</span>
                          <div className="w-12 bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden hidden sm:block">
                            <div 
                              style={{ width: `${fillRate}%` }} 
                              className={`h-full ${fillRate >= 95 ? 'bg-amber-600' : 'bg-emerald-600'}`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Female / Male */}
                      <td className="py-3.5 px-3 text-center text-xs font-semibold whitespace-nowrap">
                        <span 
                          onClick={() => {
                            if (subDefObj && isAdmin) {
                              openDrillDown(`${item.name} - Female Students`, `Female students admitted in ${item.name}`, s => matchesSubjectDefinition(s.subject, subDefObj) && s.gender === 'Female');
                            }
                          }}
                          className={`text-pink-700 dark:text-pink-400 ${isAdmin ? 'cursor-pointer hover:underline font-bold' : ''}`}
                        >
                          {item.female} F
                        </span>
                        <span className="text-stone-400 mx-1">/</span>
                        <span 
                          onClick={() => {
                            if (subDefObj && isAdmin) {
                              openDrillDown(`${item.name} - Male Students`, `Male students admitted in ${item.name}`, s => matchesSubjectDefinition(s.subject, subDefObj) && s.gender === 'Male');
                            }
                          }}
                          className={`text-blue-700 dark:text-blue-400 ${isAdmin ? 'cursor-pointer hover:underline font-bold' : ''}`}
                        >
                          {item.male} M
                        </span>
                      </td>

                      {/* Category Breakdown Badges - Admin Only */}
                      {isAdmin && (
                        <td className="py-3.5 px-4 min-w-[220px]">
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono font-bold">
                            <span 
                              onClick={() => {
                                if (subDefObj) openDrillDown(`${item.name} - GEN Category`, `GEN category students in ${item.name}`, s => matchesSubjectDefinition(s.subject, subDefObj) && isCategory(s, 'GEN'));
                              }}
                              className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded border border-stone-200 dark:border-stone-700 cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700"
                            >
                              GEN: {item.catCounts.GEN}
                            </span>
                            <span 
                              onClick={() => {
                                if (subDefObj) openDrillDown(`${item.name} - SC Category`, `SC category students in ${item.name}`, s => matchesSubjectDefinition(s.subject, subDefObj) && isCategory(s, 'SC'));
                              }}
                              className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900"
                            >
                              SC: {item.catCounts.SC}
                            </span>
                            <span 
                              onClick={() => {
                                if (subDefObj) openDrillDown(`${item.name} - ST Category`, `ST category students in ${item.name}`, s => matchesSubjectDefinition(s.subject, subDefObj) && isCategory(s, 'ST'));
                              }}
                              className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900"
                            >
                              ST: {item.catCounts.ST}
                            </span>
                            <span 
                              onClick={() => {
                                if (subDefObj) openDrillDown(`${item.name} - SEBC Category`, `SEBC category students in ${item.name}`, s => matchesSubjectDefinition(s.subject, subDefObj) && isCategory(s, 'SEBC'));
                              }}
                              className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 rounded border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-900"
                            >
                              SEBC: {item.catCounts.SEBC}
                            </span>
                            <span 
                              onClick={() => {
                                if (subDefObj) openDrillDown(`${item.name} - OBC Category`, `OBC category students in ${item.name}`, s => matchesSubjectDefinition(s.subject, subDefObj) && isCategory(s, 'OBC'));
                              }}
                              className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800 cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900"
                            >
                              OBC: {item.catCounts.OBC}
                            </span>
                          </div>
                        </td>
                      )}

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center text-stone-500">
                    No subject statistical records match the active filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}

      {statsViewMode === 'pie' && (
        <div className="space-y-8">
          <div className="bg-white dark:bg-stone-900 p-6 sm:p-8 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                  Visual Pie & Donut Analytics
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Proportional percentage breakdown of admissions by gender, category, and stream. Click any segment or card to inspect students.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gender Distribution Pie */}
              <div className="p-6 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-4">
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-pink-600" />
                  <span>Gender Distribution Ratio</span>
                </h4>
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
                  <div className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-inner" style={{
                    background: `conic-gradient(#db2777 0% ${metrics.femalePercentage}%, #2563eb ${metrics.femalePercentage}% 100%)`
                  }}>
                    <div className="w-24 h-24 bg-white dark:bg-stone-900 rounded-full flex flex-col items-center justify-center shadow">
                      <span className="text-xs font-bold text-stone-500">Total</span>
                      <span className="text-lg font-bold text-stone-900 dark:text-stone-100">{metrics.totalEnrolled}</span>
                    </div>
                  </div>
                  <div className="space-y-3 text-xs w-full sm:w-auto">
                    <div 
                      onClick={() => openDrillDown('Female Students', 'List of all female students', s => s.gender === 'Female')}
                      className="flex items-center justify-between gap-4 p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 cursor-pointer hover:bg-pink-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-pink-600" />
                        <span className="font-semibold text-pink-900 dark:text-pink-300">Female Students</span>
                      </div>
                      <span className="font-bold text-pink-700 dark:text-pink-400">{metrics.femaleCount} ({metrics.femalePercentage}%)</span>
                    </div>
                    <div 
                      onClick={() => openDrillDown('Male Students', 'List of all male students', s => s.gender === 'Male')}
                      className="flex items-center justify-between gap-4 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-600" />
                        <span className="font-semibold text-blue-900 dark:text-blue-300">Male Students</span>
                      </div>
                      <span className="font-bold text-blue-700 dark:text-blue-400">{metrics.maleCount} ({metrics.malePercentage}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Type Share Pie */}
              <div className="p-6 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-4">
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Course Type Share (Regular vs AEDP)</span>
                </h4>
                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
                  <div className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-inner" style={{
                    background: `conic-gradient(#d97706 0% ${metrics.totalEnrolled > 0 ? (metrics.regularCount / metrics.totalEnrolled) * 100 : 80}%, #059669 ${metrics.totalEnrolled > 0 ? (metrics.regularCount / metrics.totalEnrolled) * 100 : 80}% 100%)`
                  }}>
                    <div className="w-24 h-24 bg-white dark:bg-stone-900 rounded-full flex flex-col items-center justify-center shadow">
                      <span className="text-xs font-bold text-stone-500">Courses</span>
                      <span className="text-sm font-bold text-stone-900 dark:text-stone-100">21 Active</span>
                    </div>
                  </div>
                  <div className="space-y-3 text-xs w-full sm:w-auto">
                    <div 
                      onClick={() => openDrillDown('Regular Course Students', 'Students in 20 Regular Honours courses', s => !((s.subject && s.subject.includes('AEDP')) || (s.rollNumber && s.rollNumber.includes('AEDP'))))}
                      className="flex items-center justify-between gap-4 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-600" />
                        <span className="font-semibold text-amber-900 dark:text-amber-300">Regular Honours</span>
                      </div>
                      <span className="font-bold text-amber-800 dark:text-amber-300">{metrics.regularCount} ({metrics.totalEnrolled > 0 ? ((metrics.regularCount / metrics.totalEnrolled) * 100).toFixed(1) : 0}%)</span>
                    </div>
                    <div 
                      onClick={() => openDrillDown('AEDP Course Students', 'Students in specialized AEDP course', s => Boolean((s.subject && s.subject.includes('AEDP')) || (s.rollNumber && s.rollNumber.includes('AEDP'))))}
                      className="flex items-center justify-between gap-4 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 cursor-pointer hover:bg-emerald-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-600" />
                        <span className="font-semibold text-emerald-900 dark:text-emerald-300">AEDP Specialized</span>
                      </div>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{metrics.aedpCount} ({metrics.totalEnrolled > 0 ? ((metrics.aedpCount / metrics.totalEnrolled) * 100).toFixed(1) : 0}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Category Shares Pie Chart */}
            <div className="p-6 sm:p-8 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-purple-600" />
                    <span>Social Category Quota Share (Pie Chart)</span>
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Proportional social quota distribution across GEN, SC, ST, SEBC, and OBC student admissions.
                  </p>
                </div>
                {isAdmin && (
                  <span className="text-[11px] text-purple-700 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800 self-start sm:self-auto">
                    Click slice / badge to inspect students
                  </span>
                )}
              </div>

              <div className="flex flex-col lg:flex-row items-center justify-around gap-8 py-4">
                {/* Visual Conic Donut Pie Chart */}
                <div className="flex flex-col items-center gap-3 shrink-0">
                  <div 
                    className="relative w-44 h-44 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                    style={{
                      background: categoryPieData.gradientString 
                        ? `conic-gradient(${categoryPieData.gradientString})`
                        : '#cbd5e1'
                    }}
                  >
                    <div className="w-28 h-28 bg-white dark:bg-stone-900 rounded-full flex flex-col items-center justify-center shadow-md border border-stone-100 dark:border-stone-800 text-center px-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total</span>
                      <span className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">
                        {metrics.totalEnrolled}
                      </span>
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400">
                        Social Quotas
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-stone-500">
                    5 Reserved & General Quotas
                  </span>
                </div>

                {/* Pie Chart Legend & Quota Distribution Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                  {categoryPieData.slices.map(cat => (
                    <div 
                      key={cat.label}
                      onClick={() => openDrillDown(`${cat.label} Category Students`, `Students under ${cat.label} quota (${cat.fullTitle})`, cat.filter)}
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 transition-all ${
                        isAdmin 
                          ? 'cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md group' 
                          : ''
                      }`}
                      title={isAdmin ? `Click to inspect ${cat.count} ${cat.label} students` : undefined}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span 
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-stone-900 dark:text-stone-100 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors block">
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-stone-400 truncate block">
                            {cat.fullTitle}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-sm text-stone-900 dark:text-stone-100 block">
                          {cat.count}
                        </span>
                        <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                          {cat.pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supporting Students Drill-Down Modal for Admin */}
      {drillDownModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-amber-900 to-stone-900 text-white flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Admin Supporting Data Inspection</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-amber-100">
                  {drillDownModal.title}
                </h3>
                <p className="text-xs text-amber-200/80">
                  {drillDownModal.subtitle}
                </p>
              </div>

              <button
                onClick={() => setDrillDownModal(prev => ({ ...prev, isOpen: false }))}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-colors"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Control & Search Bar */}
            <div className="p-4 sm:p-6 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter student name, roll, barcode..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-xs font-bold text-stone-600 dark:text-stone-300 font-mono">
                  Showing {searchedSupportingStudents.length} of {supportingStudents.length} Students
                </span>

                <button
                  onClick={exportModalCSV}
                  disabled={searchedSupportingStudents.length === 0}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export List</span>
                </button>
              </div>
            </div>

            {/* Modal Student List Table */}
            <div className="overflow-x-auto flex-grow p-4 sm:p-6">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-amber-50 dark:bg-stone-800 border-b border-amber-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 uppercase text-[11px] font-bold tracking-wider">
                    <th className="py-3 px-3 text-center">Sl</th>
                    <th className="py-3 px-3">Roll Number</th>
                    <th className="py-3 px-3">Barcode Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-3 text-center">Gender</th>
                    <th className="py-3 px-3 text-center">Category</th>
                    <th className="py-3 px-4">Subject / Course</th>
                    <th className="py-3 px-3">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {searchedSupportingStudents.length > 0 ? (
                    searchedSupportingStudents.map((student, idx) => (
                      <tr key={student.id || idx} className="hover:bg-amber-50/60 dark:hover:bg-stone-800/60 transition-colors">
                        <td className="py-3 px-3 text-center font-mono font-bold text-stone-500">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-900 dark:text-stone-100">
                          {student.rollNumber || '—'}
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-600 dark:text-stone-400 text-xs">
                          {student.barcode || '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                          <div>
                            <div>{student.name}</div>
                            {(student.fatherName || student.motherName || student.parentsName) && (
                              <div className="text-[10px] text-stone-400 font-normal">
                                Parent: {student.fatherName || student.motherName || student.parentsName}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            student.gender === 'Female'
                              ? 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {student.gender}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                            (student.category || '').includes('ST') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                            (student.category || '').includes('SC') ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            (student.category || '').includes('SEBC') ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                            (student.category || '').includes('OBC') ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                            'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200'
                          }`}>
                            {student.category || 'GEN'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-stone-800 dark:text-stone-200 whitespace-nowrap">
                          <div>
                            <span className="font-bold">{student.subject || student.departmentName || '—'}</span>
                            <span className="text-[10px] text-stone-400 block">{student.stream}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-600 dark:text-stone-400 text-xs">
                          {student.phone || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-stone-500">
                        No supporting student records match the search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 bg-stone-50 dark:bg-stone-850 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <span className="text-xs text-stone-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                <span>Supporting data strictly verified against SAMS e-Admission database</span>
              </span>

              <button
                onClick={() => setDrillDownModal(prev => ({ ...prev, isOpen: false }))}
                className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Close Inspection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

