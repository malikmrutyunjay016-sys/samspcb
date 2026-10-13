import React, { useState, useMemo, useEffect } from 'react';
import { 
  Layers, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  BookOpen, 
  Edit3, 
  Check, 
  X, 
  RotateCcw, 
  SlidersHorizontal,
  CheckCircle,
  BookmarkCheck,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Student } from '../types';
import { 
  getSavedSanctionedSeats, 
  saveSanctionedSeats, 
  saveSanctionedSeatsAsDefault,
  getDefaultSanctionedSeats,
  getSanctionedSeatsMeta,
  fetchRemoteSanctionedSeats, 
  resetToSavedDefaults,
  resetToGovtBenchmark,
  ORIGINAL_GOVT_BASE_STRENGTHS,
  SanctionedSeatsMeta,
  ALL_SUBJECT_DEFINITIONS,
  matchesSubjectDefinition
} from '../utils/sanctionedSeatsService';

interface SeatMatrixViewProps {
  students?: Student[];
  onSelectSubjectFilter?: (subject: string) => void;
  userRole?: 'admin' | 'hod' | 'student' | null;
  onAuditLog?: (action: string, details: string) => void;
  sanctionedSeatsMap?: Record<string, number>;
  defaultSeatsMap?: Record<string, number>;
  seatsMeta?: SanctionedSeatsMeta;
}

interface SubjectDefinition {
  code: string;
  name: string;
  stream: string;
  isAedp: boolean;
  baseStrength: number;
}

export const SeatMatrixView: React.FC<SeatMatrixViewProps> = ({ 
  students = [], 
  onSelectSubjectFilter,
  userRole = null,
  onAuditLog,
  sanctionedSeatsMap: propsCustomSeats,
  defaultSeatsMap: propsDefaultSeats,
  seatsMeta: propsSeatsMeta
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'AEDP' | 'REGULAR'>('ALL');
  const [streamFilter, setStreamFilter] = useState<string>('ALL');

  // Admin status check: ONLY users logged in as admin can edit any sanctioned seat data
  const isAdmin = userRole === 'admin';

  // Custom sanctioned seats overrides saved by admin
  const [customSeats, setCustomSeats] = useState<Record<string, number>>(() => propsCustomSeats || getSavedSanctionedSeats());
  
  // Default sanctioned seats saved by admin
  const [defaultSeats, setDefaultSeats] = useState<Record<string, number>>(() => propsDefaultSeats || getDefaultSanctionedSeats());

  // Metadata for default
  const [seatsMeta, setSeatsMeta] = useState<SanctionedSeatsMeta>(() => propsSeatsMeta || getSanctionedSeatsMeta());
  
  // Sync with props if they change
  useEffect(() => {
    if (propsCustomSeats) setCustomSeats(propsCustomSeats);
  }, [propsCustomSeats]);

  useEffect(() => {
    if (propsDefaultSeats) setDefaultSeats(propsDefaultSeats);
  }, [propsDefaultSeats]);

  useEffect(() => {
    if (propsSeatsMeta) setSeatsMeta(propsSeatsMeta);
  }, [propsSeatsMeta]);
  
  // Single row inline editing state
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [tempSeatValue, setTempSeatValue] = useState<number>(0);

  // Bulk Edit modal state
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkDraftSeats, setBulkDraftSeats] = useState<Record<string, number>>({});
  const [makeDefaultInModal, setMakeDefaultInModal] = useState<boolean>(true);

  // Toast feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 4000);
  };

  // Shared 28 distinct subjects from SAMS Panchayat College admission records
  const allSubjectDefinitions = ALL_SUBJECT_DEFINITIONS;

  // Calculate admitted counts and sanctioned strength from actual student records and custom overrides
  const subjectsWithCounts = useMemo(() => {
    return allSubjectDefinitions.map((subDef) => {
      const admittedCount = students.filter((s) => matchesSubjectDefinition(s.subject, subDef)).length;
      
      // Determine effective sanctioned seats: custom override if present, else defaultSeats, else baseStrength
      const customVal = customSeats[subDef.code];
      const defaultVal = defaultSeats[subDef.code] ?? subDef.baseStrength;
      const sanctionedStrength = customVal !== undefined ? customVal : defaultVal;
      const vacancy = Math.max(0, sanctionedStrength - admittedCount);
      const isCustomFromBenchmark = sanctionedStrength !== subDef.baseStrength;
      const isCustomFromDefault = sanctionedStrength !== defaultVal;

      return {
        ...subDef,
        admittedCount,
        sanctionedStrength,
        vacancy,
        defaultStrength: defaultVal,
        isCustomFromBenchmark,
        isCustomFromDefault
      };
    });
  }, [allSubjectDefinitions, students, customSeats, defaultSeats]);

  // Filter based on UI toggles
  const filteredSubjects = useMemo(() => {
    return subjectsWithCounts.filter((item) => {
      if (filterType === 'AEDP' && !item.isAedp) return false;
      if (filterType === 'REGULAR' && item.isAedp) return false;
      if (streamFilter !== 'ALL' && item.stream !== streamFilter) return false;
      return true;
    });
  }, [subjectsWithCounts, filterType, streamFilter]);

  const totalStrength = useMemo(() => subjectsWithCounts.reduce((acc, curr) => acc + curr.sanctionedStrength, 0), [subjectsWithCounts]);
  const totalAdmitted = useMemo(() => subjectsWithCounts.reduce((acc, curr) => acc + curr.admittedCount, 0), [subjectsWithCounts]);
  const totalVacancy = useMemo(() => subjectsWithCounts.reduce((acc, curr) => acc + curr.vacancy, 0), [subjectsWithCounts]);

  const aedpTotal = useMemo(() => subjectsWithCounts.filter(s => s.isAedp).reduce((acc, curr) => acc + curr.admittedCount, 0), [subjectsWithCounts]);
  const regularTotal = useMemo(() => subjectsWithCounts.filter(s => !s.isAedp).reduce((acc, curr) => acc + curr.admittedCount, 0), [subjectsWithCounts]);

  // Check if current seats differ from saved defaults
  const isDifferentFromDefault = useMemo(() => {
    return allSubjectDefinitions.some(sub => {
      const current = customSeats[sub.code] ?? defaultSeats[sub.code] ?? sub.baseStrength;
      const def = defaultSeats[sub.code] ?? sub.baseStrength;
      return current !== def;
    });
  }, [customSeats, defaultSeats, allSubjectDefinitions]);

  // Check if saved defaults differ from initial 2026 govt benchmarks
  const isDefaultCustomizedFromGovt = useMemo(() => {
    return allSubjectDefinitions.some(sub => {
      const def = defaultSeats[sub.code] ?? sub.baseStrength;
      return def !== sub.baseStrength;
    });
  }, [defaultSeats, allSubjectDefinitions]);

  // Handler: Save current seats as College Default
  const handleMakeCurrentSeatsDefault = () => {
    const seatsToSave: Record<string, number> = {};
    allSubjectDefinitions.forEach(sub => {
      seatsToSave[sub.code] = customSeats[sub.code] ?? defaultSeats[sub.code] ?? sub.baseStrength;
    });

    saveSanctionedSeatsAsDefault(seatsToSave);
    setDefaultSeats(seatsToSave);
    setCustomSeats(seatsToSave);
    setSeatsMeta({
      lastUpdated: new Date().toISOString(),
      updatedBy: 'Admin',
      isDefault: true,
      totalStrength
    });

    showToast(`✓ Sanctioned seats saved and established as default (${totalStrength} total seats)`);
    if (onAuditLog) {
      onAuditLog(
        'Set Sanctioned Seats as Default',
        `Admin established ${totalStrength} sanctioned seats across all 28 subjects as official college default`
      );
    }
  };

  // Handler: Save single subject seat
  const handleSaveSingleSeat = (code: string, newSeats: number, makeDefault: boolean = true) => {
    if (isNaN(newSeats) || newSeats < 0) return;
    const sub = allSubjectDefinitions.find(s => s.code === code);
    const updated = { ...customSeats, [code]: newSeats };
    setCustomSeats(updated);

    if (makeDefault) {
      const updatedDefaults = { ...defaultSeats, [code]: newSeats };
      saveSanctionedSeatsAsDefault(updatedDefaults);
      setDefaultSeats(updatedDefaults);
      setSeatsMeta({
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Admin',
        isDefault: true,
        totalStrength: Object.values(updatedDefaults).reduce((a, b) => a + b, 0)
      });
      showToast(`Sanctioned seats for ${sub?.name || code} updated to ${newSeats} & saved as default`);
      if (onAuditLog) {
        onAuditLog(
          'Update & Make Default Sanctioned Seats',
          `Subject ${code} (${sub?.name}) sanctioned seats set to ${newSeats} and saved as default`
        );
      }
    } else {
      saveSanctionedSeats(updated, 'Admin', false);
      showToast(`Sanctioned seats for ${sub?.name || code} updated to ${newSeats}`);
      if (onAuditLog) {
        onAuditLog(
          'Update Sanctioned Seats',
          `Subject ${code} (${sub?.name}) sanctioned seats updated to ${newSeats}`
        );
      }
    }
    setEditingCode(null);
  };

  // Handler: Reset single subject seat back to default
  const handleResetSingleSeat = (code: string) => {
    const sub = allSubjectDefinitions.find(s => s.code === code);
    if (!sub) return;
    const defVal = defaultSeats[code] ?? sub.baseStrength;
    const updated = { ...customSeats, [code]: defVal };
    setCustomSeats(updated);
    saveSanctionedSeats(updated, 'Admin', false);
    setEditingCode(null);
    showToast(`Sanctioned seats for ${sub.name} reset to default (${defVal})`);
    if (onAuditLog) {
      onAuditLog('Reset Subject Sanctioned Seats', `Reset ${code} to default strength ${defVal}`);
    }
  };

  // Handler: Open bulk edit modal
  const handleOpenBulkEdit = () => {
    const initialDraft: Record<string, number> = {};
    allSubjectDefinitions.forEach(s => {
      initialDraft[s.code] = customSeats[s.code] ?? defaultSeats[s.code] ?? s.baseStrength;
    });
    setBulkDraftSeats(initialDraft);
    setMakeDefaultInModal(true);
    setIsBulkEditOpen(true);
  };

  // Handler: Save bulk seats
  const handleSaveBulkSeats = (asDefault: boolean) => {
    setCustomSeats(bulkDraftSeats);
    if (asDefault) {
      saveSanctionedSeatsAsDefault(bulkDraftSeats);
      setDefaultSeats(bulkDraftSeats);
      setSeatsMeta({
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Admin',
        isDefault: true,
        totalStrength: Object.values(bulkDraftSeats).reduce((a, b) => a + b, 0)
      });
      showToast('All sanctioned seat changes saved and made default successfully!');
      if (onAuditLog) {
        onAuditLog(
          'Bulk Save Sanctioned Seats as Default',
          'Updated sanctioned seats for subjects and established as official college default'
        );
      }
    } else {
      saveSanctionedSeats(bulkDraftSeats, 'Admin', false);
      showToast('Sanctioned seat changes saved for this session!');
      if (onAuditLog) {
        onAuditLog('Bulk Update Sanctioned Seats', 'Updated sanctioned seats for multiple subjects');
      }
    }
    setIsBulkEditOpen(false);
  };

  // Handler: Reset all seats to Saved Default
  const handleResetToSavedDefaults = () => {
    const restored = resetToSavedDefaults();
    setCustomSeats(restored);
    showToast('Restored all sanctioned seats to saved College Defaults');
    if (onAuditLog) {
      onAuditLog('Reset to Saved Default Seats', 'Reverted active matrix to saved college defaults');
    }
  };

  // Handler: Reset all seats to Govt Benchmark
  const handleResetToGovtBenchmark = () => {
    if (window.confirm('Reset all sanctioned seats and default matrix back to the original 2026 Government benchmark?')) {
      const benchmark = resetToGovtBenchmark();
      setCustomSeats(benchmark);
      setDefaultSeats(benchmark);
      setSeatsMeta({
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Admin',
        isDefault: true,
        totalStrength: Object.values(benchmark).reduce((a, b) => a + b, 0)
      });
      setIsBulkEditOpen(false);
      showToast('Sanctioned seats reset to original Government benchmark (2026)');
      if (onAuditLog) {
        onAuditLog('Reset Sanctioned Seats to Govt Benchmark', 'Restored original Odisha govt seat matrix');
      }
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/50 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-orange-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 text-xs font-semibold">
          <span className="px-3 py-1 bg-white/20 rounded-full flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-amber-200" />
            <span>Panchayat College, Baragada (Bargarh)</span>
          </span>
          <span className="px-3 py-1 bg-white/20 rounded-full flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-200" />
            <span>District: Bargarh • Block: Baragarh (MPL)</span>
          </span>
          <span className="px-3 py-1 bg-emerald-500/80 text-white rounded-full font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Academic Session 2026-27 (SAMS Odisha)</span>
          </span>
        </div>

        {/* Title without "Real-Time" */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl sm:text-4xl font-serif font-bold">Subjects & Seat Matrix</h2>
              <span className="px-3 py-1 bg-amber-400/20 border border-amber-300/40 text-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>{isDefaultCustomizedFromGovt ? 'College Default Configured' : 'Default Sanctions Active'}</span>
              </span>
            </div>
            <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              Complete registry of all 28 subjects from official SAMS records. Specialized AEDP subjects are tracked and counted independently from traditional honours subjects.
            </p>
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Make Default button */}
              <button
                onClick={handleMakeCurrentSeatsDefault}
                title="Save the current sanctioned seats configuration as the college default"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
              >
                <BookmarkCheck className="w-4 h-4 text-emerald-100" />
                <span>Save as Default</span>
              </button>

              {/* Edit button */}
              <button
                onClick={handleOpenBulkEdit}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-200" />
                <span>Edit Sanctioned Seats</span>
              </button>

              {/* Revert if different from default */}
              {isDifferentFromDefault && (
                <button
                  onClick={handleResetToSavedDefaults}
                  title="Revert modifications back to saved College Defaults"
                  className="px-3 py-2 bg-stone-900/40 hover:bg-stone-900/60 text-amber-200 border border-amber-300/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to Default</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4">
            <p className="text-[11px] text-amber-200 font-semibold uppercase">Total Subjects</p>
            <p className="text-2xl sm:text-3xl font-serif font-bold mt-1">28 Subjects</p>
            <p className="text-[10px] text-amber-200/80 mt-0.5">8 AEDP + 20 Regular</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4">
            <p className="text-[11px] text-amber-200 font-semibold uppercase">Total Admitted</p>
            <p className="text-2xl sm:text-3xl font-serif font-bold mt-1 text-emerald-300">{totalAdmitted}</p>
            <p className="text-[10px] text-emerald-200/80 mt-0.5">{aedpTotal} AEDP | {regularTotal} Regular</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-amber-200 font-semibold uppercase">Sanctioned Seats</p>
              <span className="text-[9px] px-1.5 py-0.5 bg-emerald-400/30 text-emerald-100 rounded font-bold flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" />
                <span>Default</span>
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-serif font-bold mt-1">{totalStrength}</p>
            <p className="text-[10px] text-amber-200/80 mt-0.5">
              {isAdmin ? 'Saved as College Default' : 'Approved Intake'}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4">
            <p className="text-[11px] text-amber-200 font-semibold uppercase">Spot Vacancies</p>
            <p className="text-2xl sm:text-3xl font-serif font-bold mt-1 text-amber-300">{totalVacancy}</p>
            <p className="text-[10px] text-amber-200/80 mt-0.5">Open admission seats</p>
          </div>
        </div>
      </div>

      {/* AEDP vs Regular Comparison Callout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-stone-900 border border-amber-200 dark:border-stone-800 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">AEDP Specialized Subjects (8 Courses)</h4>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            Advanced Employment & Digital Pedagogy (AEDP) courses integrate modern industry skills such as Digital Humanities, Data Analytics, Tourism Operations, BFSI, Tissue Culture, and Computing.
          </p>
          <div className="pt-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
            Total AEDP Enrolled: <span className="text-sm font-bold">{aedpTotal} students</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">Regular Honours Subjects (20 Courses)</h4>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            Traditional undergraduate degree honours under Sambalpur University and Council of Higher Secondary Education across Humanities, Social Sciences, Pure Sciences, Commerce, and Self-Financing Computer Science.
          </p>
          <div className="pt-2 text-xs font-semibold text-stone-800 dark:text-stone-300">
            Total Regular Honours Enrolled: <span className="text-sm font-bold">{regularTotal} students</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-amber-200 dark:border-stone-800 shadow-sm">
        {/* Type Toggle: All vs AEDP vs Regular */}
        <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'ALL'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            All Subjects (28)
          </button>
          <button
            onClick={() => setFilterType('AEDP')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              filterType === 'AEDP'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            <span>AEDP Courses (8)</span>
          </button>
          <button
            onClick={() => setFilterType('REGULAR')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'REGULAR'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
            }`}
          >
            Regular Honours (20)
          </button>
        </div>

        {/* Stream Filter & Quick Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 whitespace-nowrap">Filter Stream:</span>
            <select
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-medium text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-600"
            >
              <option value="ALL">All Streams</option>
              <option value="Arts">Arts</option>
              <option value="Commerce">Commerce</option>
              <option value="Biological Science">Biological Science</option>
              <option value="Physical Science">Physical Science</option>
              <option value="Self Financing">Self Financing</option>
            </select>
          </div>

          {isAdmin && (
            <button
              onClick={handleOpenBulkEdit}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin Edit Seats</span>
            </button>
          )}
        </div>
      </div>

      {/* Subject & Seat Matrix Table */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-amber-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100">
              Subject-wise Breakdown & Admitted Counts ({filteredSubjects.length} Subjects)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="text-[11px] px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>Sanctioned seats saved as default</span>
              </span>
            )}
            <span className="text-xs px-2.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium rounded-full border border-stone-200 dark:border-stone-700">
              SAMS Student DB Synced
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-amber-50/80 dark:bg-stone-800/80 border-b border-amber-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-[11px] uppercase font-bold tracking-wider">
                <th className="py-3.5 px-4">Sl No</th>
                <th className="py-3.5 px-4">Stream / Faculty</th>
                <th className="py-3.5 px-4">Subject Name</th>
                <th className="py-3.5 px-3 text-center">Type</th>
                <th className="py-3.5 px-4 text-center">Sanctioned Seats</th>
                <th className="py-3.5 px-4 text-center">Admitted Count</th>
                <th className="py-3.5 px-4 text-center">Spot Vacancy</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3.5 px-4 text-center">Admin Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
              {filteredSubjects.map((item, index) => {
                const isEditingThisRow = editingCode === item.code;

                return (
                  <tr key={item.code} className="hover:bg-amber-50/40 dark:hover:bg-stone-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-stone-500">{index + 1}</td>
                    
                    {/* Stream */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-md border border-stone-200 dark:border-stone-700">
                        {item.stream}
                      </span>
                    </td>

                    {/* Subject Name */}
                    <td className="py-3.5 px-4 font-serif font-bold text-stone-900 dark:text-stone-100 max-w-md">
                      <span>{item.name}</span>
                    </td>

                    {/* Type (AEDP vs Regular) */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {item.isAedp ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[11px] font-bold rounded-full border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>AEDP</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 text-[11px] font-medium rounded-full">
                          Regular
                        </span>
                      )}
                    </td>

                    {/* Sanctioned Seats (Editable for Admin) */}
                    <td className="py-3.5 px-4 text-center">
                      {isEditingThisRow ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={tempSeatValue}
                            onChange={(e) => setTempSeatValue(Math.max(0, parseInt(e.target.value) || 0))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveSingleSeat(item.code, tempSeatValue, true);
                              if (e.key === 'Escape') setEditingCode(null);
                            }}
                            autoFocus
                            className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-white dark:bg-stone-800 border-2 border-emerald-600 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            onClick={() => handleSaveSingleSeat(item.code, tempSeatValue, true)}
                            title="Save as Default"
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCode(null)}
                            title="Cancel"
                            className="p-1 rounded bg-stone-300 hover:bg-stone-400 dark:bg-stone-700 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 group">
                          <span className="font-mono font-bold text-stone-900 dark:text-stone-100">
                            {item.sanctionedStrength}
                          </span>
                          <span 
                            className="text-[9px] px-1 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-semibold"
                            title="Official Default Sanction"
                          >
                            Default
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingCode(item.code);
                                setTempSeatValue(item.sanctionedStrength);
                              }}
                              title="Edit Sanctioned Seats"
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-amber-100 dark:hover:bg-stone-800 text-stone-500 hover:text-amber-700 rounded transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Admitted Count */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {item.admittedCount}
                    </td>

                    {/* Spot Vacancy */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                      {item.vacancy}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        item.vacancy > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}>
                        {item.vacancy > 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{item.vacancy > 0 ? `${item.vacancy} Open` : 'Full'}</span>
                      </span>
                    </td>

                    {/* Admin Action */}
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isEditingThisRow ? (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
                            Editing & saving as default...
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingCode(item.code);
                                setTempSeatValue(item.sanctionedStrength);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-stone-700 border border-amber-200 dark:border-stone-700 rounded-lg transition-colors inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            {item.isCustomFromBenchmark && (
                              <button
                                onClick={() => handleResetSingleSeat(item.code)}
                                title={`Reset to base benchmark (${item.baseStrength})`}
                                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-md transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Edit Modal for Admin */}
      {isBulkEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-amber-200 dark:border-stone-800 my-8 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  <h3 className="font-serif font-bold text-xl text-stone-900 dark:text-stone-100">
                    Edit Sanctioned Seats Matrix
                  </h3>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Adjust sanctioned seats for any of the 28 official SAMS degree subjects and set as default.
                </p>
              </div>
              <button
                onClick={() => setIsBulkEditOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of subjects to edit */}
            <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allSubjectDefinitions.map((sub) => {
                  const currentVal = bulkDraftSeats[sub.code] !== undefined ? bulkDraftSeats[sub.code] : (defaultSeats[sub.code] ?? sub.baseStrength);
                  const admitted = students.filter(s => s.subject === sub.name).length;
                  const isModifiedFromBase = currentVal !== sub.baseStrength;

                  return (
                    <div 
                      key={sub.code} 
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isModifiedFromBase 
                          ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/30' 
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded font-semibold">
                              {sub.stream}
                            </span>
                            {sub.isAedp && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-300 rounded font-bold">
                                AEDP
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 mt-1 truncate" title={sub.name}>
                            {sub.name}
                          </p>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            Admitted: <span className="font-bold text-emerald-600">{admitted}</span> • Benchmark: <span className="font-mono">{sub.baseStrength}</span>
                          </p>
                        </div>

                        {/* Input for seats */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-stone-500 font-semibold uppercase">Seats</span>
                            <input
                              type="number"
                              min="0"
                              max="999"
                              value={currentVal}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setBulkDraftSeats(prev => ({ ...prev, [sub.code]: val }));
                              }}
                              className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-white dark:bg-stone-900 border border-emerald-500 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          {isModifiedFromBase && (
                            <button
                              onClick={() => {
                                setBulkDraftSeats(prev => ({ ...prev, [sub.code]: sub.baseStrength }));
                              }}
                              title="Reset this subject to base benchmark"
                              className="p-1 mt-3.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checkbox: Make Default */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-emerald-900 dark:text-emerald-200">
                <input 
                  type="checkbox"
                  checked={makeDefaultInModal}
                  onChange={(e) => setMakeDefaultInModal(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                />
                <span className="font-bold flex items-center gap-1">
                  <BookmarkCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Save these sanctioned seats and make it default
                </span>
              </label>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 hidden sm:inline">
                Saves to storage & sets as official college baseline
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                onClick={handleResetToGovtBenchmark}
                className="px-3 py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1.5 transition-colors"
                title="Reset all back to 2026 Odisha Govt benchmark"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Govt Benchmark (2026)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBulkEditOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveBulkSeats(makeDefaultInModal)}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>{makeDefaultInModal ? 'Save & Make Default' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
