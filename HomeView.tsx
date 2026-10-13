import React, { useState, useMemo } from 'react';
import { Sparkles, Award, BookOpen, ArrowRight, Bell, Layers, CheckCircle2, AlertCircle, ExternalLink, Edit3, Save, X } from 'lucide-react';
import { Notice, Department, Student } from '../types';
import { getSavedSanctionedSeats, ORIGINAL_GOVT_BASE_STRENGTHS } from '../utils/sanctionedSeatsService';

interface HomeViewProps {
  setActiveTab: (tab: string) => void;
  notices: Notice[];
  departments: Department[];
  students?: Student[];
  isSpotRoundEnabled?: boolean;
  userRole?: 'admin' | 'hod' | 'student' | null;
  prospectusUrl: string;
  onUpdateProspectusUrl: (url: string) => void;
}

interface CourseSeatDetail {
  code: string;
  name: string;
  shortLabel: string;
  sanctionedSeats: number;
  filledSeats: number;
  availableSeats: number;
}

interface DepartmentGroupCard {
  id: string;
  code: string;
  name: string;
  hodName: string;
  description: string;
  regularCourse: CourseSeatDetail;
  aedpCourse?: CourseSeatDetail;
  totalSanctioned: number;
  totalFilled: number;
  totalAvailable: number;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  setActiveTab, 
  notices, 
  departments, 
  students = [],
  isSpotRoundEnabled = true,
  userRole = null,
  prospectusUrl,
  onUpdateProspectusUrl
}) => {
  const [isEditingProspectus, setIsEditingProspectus] = useState<boolean>(false);
  const [tempUrl, setTempUrl] = useState<string>(prospectusUrl);

  // Sync tempUrl when prospectusUrl prop changes
  React.useEffect(() => {
    setTempUrl(prospectusUrl);
  }, [prospectusUrl]);

  const seatsMap = useMemo(() => getSavedSanctionedSeats(), []);
  const canSeeSpotRound = isSpotRoundEnabled || userRole === 'admin';

  // Synchronize department & seat matrix state directly from student database & sanctioned seats matrix
  const departmentGroupCards: DepartmentGroupCard[] = useMemo(() => {
    // Helper to get seat status for a specific subject code and subject string name
    const getCourseDetail = (code: string, subjectName: string, shortLabel: string): CourseSeatDetail => {
      const sanctionedSeats = seatsMap[code] ?? ORIGINAL_GOVT_BASE_STRENGTHS[code] ?? 32;
      const filledSeats = students.filter(s => s.subject === subjectName).length;
      const availableSeats = Math.max(0, sanctionedSeats - filledSeats);
      return {
        code,
        name: subjectName,
        shortLabel,
        sanctionedSeats,
        filledSeats,
        availableSeats
      };
    };

    // Mapping of 20 departments with their Regular course and corresponding AEDP course
    const deptDefinitions = [
      {
        id: 'dept-eng',
        code: 'ENG',
        name: 'Department of English',
        hodName: 'Prof. S. Pradhan',
        description: 'World Literature, Linguistics, Creative Writing & Digital Humanities.',
        regular: { code: 'H-ENG', name: 'English', shortLabel: 'Regular Honours' },
        aedp: { code: 'AEDP-ENG', name: 'B.A in English and Translation & digital humanities (AEDP)', shortLabel: 'AEDP Specialization' }
      },
      {
        id: 'dept-hist',
        code: 'HIST',
        name: 'Department of History',
        hodName: 'Dr. R. N. Panda',
        description: 'Indian & World History, Archival Studies, Tourism & Hospitality Operations.',
        regular: { code: 'H-HIST', name: 'History', shortLabel: 'Regular Honours' },
        aedp: { code: 'AEDP-HIST', name: 'B.A in History with Tourism and Hospitality Operations (AEDP)', shortLabel: 'AEDP Specialization' }
      },
      {
        id: 'dept-eco',
        code: 'ECO',
        name: 'Department of Economics',
        hodName: 'Prof. P. K. Sahoo',
        description: 'Micro/Macro Economics, Econometrics, Quantitative Finance & Data Analytics.',
        regular: { code: 'H-ECO', name: 'Economics', shortLabel: 'Regular Honours' },
        aedp: { code: 'AEDP-ECO', name: 'B.A in Economics and data analytics (AEDP)', shortLabel: 'AEDP Specialization' }
      },
      {
        id: 'dept-comm',
        code: 'COMM',
        name: 'Department of Commerce',
        hodName: 'Dr. P. K. Jena',
        description: 'Financial Accounting, Corporate Law, Banking, Financial Services & Insurance (BFSI).',
        regular: { code: 'H-COM', name: 'Commerce', shortLabel: 'Regular Honours' },
        aedp: { code: 'AEDP-COM', name: 'B.Com in Banking, Financial Services and Insurance and Commerce (AEDP)', shortLabel: 'AEDP Specialization' }
      },
      {
        id: 'dept-bot',
        code: 'BOT',
        name: 'Department of Botany',
        hodName: 'Dr. S. K. Pradhan',
        description: 'Plant Biology, Tissue Culture, Vertical Gardening & Agricultural Biotechnology.',
        regular: { code: 'H-BOT', name: 'Botany', shortLabel: 'Regular Honours' },
        aedp: { code: 'AEDP-BOT', name: 'B.SC in Botany with Tissue culture and vertical gardening (AEDP)', shortLabel: 'AEDP Specialization' }
      },
      {
        id: 'dept-zoo',
        code: 'ZOO',
        name: 'Department of Zoology',
        hodName: 'Dr. L. N. Patel',
        description: 'Animal Physiology, Environmental Biology, Genomics & Integrative Bioscience.',
        regular: { code: 'H-ZOO', name: 'Zoology', shortLabel: 'Regular Honours' },
        aedp: { code: 'AEDP-ZOO', name: 'B.SC in Zoology and integrative bioscience (AEDP)', shortLabel: 'AEDP Specialization' }
      },
      {
        id: 'dept-math',
        code: 'MATH',
        name: 'Department of Mathematics',
        hodName: 'Prof. R. N. Patel',
        description: 'Pure Algebra, Mathematical Analysis, Differential Equations & Computing.',
        regular: { code: 'H-MAT', name: 'Mathematics', shortLabel: 'Regular Honours' },
        aedp: { code: 'AEDP-MATH', name: 'B.Sc. in Mathematics & Computing (AEDP)', shortLabel: 'AEDP Specialization' }
      },
      {
        id: 'dept-chem',
        code: 'CHEM',
        name: 'Department of Chemistry',
        hodName: 'Dr. Anita Dash',
        description: 'Organic, Inorganic & Physical Chemistry, Industrial Chemistry & Spectroscopy.',
        regular: { code: 'H-CHE', name: 'Chemistry', shortLabel: 'Regular Honours' },
        aedp: { code: 'AEDP-CHEM', name: 'B.SC in Chemistry and Industrial Chemistry (AEDP)', shortLabel: 'AEDP Specialization' }
      },
      {
        id: 'dept-odia',
        code: 'ODIA',
        name: 'Department of Odia',
        hodName: 'Dr. B. K. Sahu',
        description: 'Odia Language, Classical Literature, Folk Culture & Modern Linguistics.',
        regular: { code: 'H-ODI', name: 'Odia', shortLabel: 'Regular Honours' }
      },
      {
        id: 'dept-ps',
        code: 'PS',
        name: 'Department of Political Science',
        hodName: 'Dr. S. K. Meher',
        description: 'Indian Constitution, Political Theory, International Relations & Governance.',
        regular: { code: 'H-POL', name: 'Political Science', shortLabel: 'Regular Honours' }
      },
      {
        id: 'dept-hindi',
        code: 'HINDI',
        name: 'Department of Hindi',
        hodName: 'Prof. M. Devi',
        description: 'Modern Hindi Literature, Poetry, Dramatics & Functional Hindi.',
        regular: { code: 'H-HIN', name: 'Hindi', shortLabel: 'Regular Honours' }
      },
      {
        id: 'dept-educ',
        code: 'EDUC',
        name: 'Department of Education',
        hodName: 'Dr. K. N. Jena',
        description: 'Educational Psychology, Pedagogy, Curriculum Planning & Educational Tech.',
        regular: { code: 'H-EDU', name: 'Education', shortLabel: 'Regular Honours' }
      },
      {
        id: 'dept-socio',
        code: 'SOCIO',
        name: 'Department of Sociology',
        hodName: 'Prof. R. Behera',
        description: 'Sociological Theory, Indian Rural Structure & Social Research Methodology.',
        regular: { code: 'H-SOC', name: 'Sociology', shortLabel: 'Regular Honours' }
      },
      {
        id: 'dept-geog',
        code: 'GEOG',
        name: 'Department of Geography',
        hodName: 'Dr. P. Sahu',
        description: 'Physical Geography, Human Cartography, GIS & Environmental Management.',
        regular: { code: 'H-GEO', name: 'Geography', shortLabel: 'Regular Honours' }
      },
      {
        id: 'dept-phil',
        code: 'PHIL',
        name: 'Department of Philosophy',
        hodName: 'Dr. Anita Dash',
        description: 'Indian Philosophy, Western Metaphysics, Logic, Ethics & Epistemology.',
        regular: { code: 'H-PHI', name: 'Philosophy', shortLabel: 'Regular Honours' }
      },
      {
        id: 'dept-sans',
        code: 'SANS',
        name: 'Department of Sanskrit',
        hodName: 'Dr. B. Mishra',
        description: 'Vedic Sanskrit, Epics, Classical Grammar & Indological Studies.',
        regular: { code: 'H-SAN', name: 'Sanskrit', shortLabel: 'Regular Honours' }
      },
      {
        id: 'dept-psych',
        code: 'PSYCH',
        name: 'Department of Psychology',
        hodName: 'Dr. S. Mohapatra',
        description: 'General Psychology, Cognitive Science, Mental Health & Counseling.',
        regular: { code: 'H-PSY', name: 'Psychology', shortLabel: 'Regular Honours' }
      },
      {
        id: 'dept-physics',
        code: 'PHY',
        name: 'Department of Physics',
        hodName: 'Dr. M. R. Mishra',
        description: 'Quantum Mechanics, Classical Electrodynamics, Solid State Physics & Electronics.',
        regular: { code: 'H-PHY', name: 'Physics', shortLabel: 'Regular Honours' }
      },
      {
        id: 'dept-stat',
        code: 'STAT',
        name: 'Department of Statistics',
        hodName: 'Prof. B. Dash',
        description: 'Probability Theory, Statistical Computing, Biostatistics & Stochastic Processes.',
        regular: { code: 'H-STA', name: 'Statistics', shortLabel: 'Regular Honours' }
      },
      {
        id: 'dept-cs',
        code: 'CS',
        name: 'Department of Computer Science',
        hodName: 'Prof. A. K. Rout',
        description: 'Data Structures, Object Oriented Programming, DBMS & Web Engineering (SF).',
        regular: { code: 'SF-CS', name: 'Computer Science', shortLabel: 'Self-Financing CS' }
      }
    ];

    return deptDefinitions.map((def) => {
      const regDetail = getCourseDetail(def.regular.code, def.regular.name, def.regular.shortLabel);
      const aedpDetail = def.aedp ? getCourseDetail(def.aedp.code, def.aedp.name, def.aedp.shortLabel) : undefined;

      const totalSanctioned = regDetail.sanctionedSeats + (aedpDetail ? aedpDetail.sanctionedSeats : 0);
      const totalFilled = regDetail.filledSeats + (aedpDetail ? aedpDetail.filledSeats : 0);
      const totalAvailable = Math.max(0, totalSanctioned - totalFilled);

      // Find matched dept from prop or fallback
      const propDept = departments.find(d => d.code === def.code || d.id === def.id);

      return {
        id: def.id,
        code: def.code,
        name: def.name,
        hodName: propDept?.hodName || def.hodName,
        description: propDept?.description || def.description,
        regularCourse: regDetail,
        aedpCourse: aedpDetail,
        totalSanctioned,
        totalFilled,
        totalAvailable
      };
    });
  }, [students, seatsMap, departments]);

  return (
    <div className="space-y-12 pb-16">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800 rounded-3xl p-8 sm:p-12 border border-amber-200/80 dark:border-stone-800 shadow-xl mt-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-400/20 to-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-700/10 text-amber-900 dark:text-amber-300 text-xs font-semibold tracking-wide border border-amber-300/50">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Govt. of Odisha SAMS E-Admission Portal 2026-27</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-serif font-extrabold text-stone-900 dark:text-stone-100 tracking-tight leading-none">
              SAMS Panchayat College, <span className="text-amber-800 dark:text-amber-400 underline decoration-wavy decoration-amber-500">Baragada</span>
            </h1>

            <p className="text-stone-700 dark:text-stone-300 text-lg sm:text-xl font-normal leading-relaxed">
              Empowering rural youth through excellence in higher education. Manage UG admissions, spot round real-time seat tracking, HOD departmental portfolios, and secure student databases.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              {canSeeSpotRound && (
                <button
                  onClick={() => setActiveTab('spot-round')}
                  className="px-6 py-3.5 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3 group"
                >
                  <span>Spot Round Live Seats</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              <button
                onClick={() => setActiveTab('seat-matrix')}
                className="px-6 py-3.5 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-amber-300 dark:border-stone-700 font-semibold rounded-2xl shadow-sm hover:bg-amber-50 dark:hover:bg-stone-700 transition-all flex items-center gap-2"
              >
                <BookOpen className="w-5 h-5 text-amber-700" />
                <span>Subjects & Seat Matrix</span>
              </button>
            </div>

            {/* Quick stats footer inside hero: NAAC 'B' */}
            <div className="pt-6 border-t border-amber-200/60 dark:border-stone-800 flex items-center gap-4">
              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-amber-200/60 dark:bg-stone-800/80 border border-amber-300/80 dark:border-stone-700 shadow-sm">
                <Award className="w-6 h-6 text-amber-800 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-lg font-bold font-serif text-amber-950 dark:text-amber-300 leading-none">NAAC 'B'</p>
                  <p className="text-xs text-stone-700 dark:text-stone-300 font-medium mt-0.5">Accredited Government College</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column / Illustrative Notice Card */}
          <div className="lg:col-span-5 space-y-4">
            {/* Common Prospectus Tab / Banner */}
            <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-orange-900 text-white rounded-3xl p-5 shadow-xl border border-amber-600/60 relative overflow-hidden flex items-center justify-between">
              <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
                  <BookOpen className="w-6 h-6 text-amber-200" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/20 rounded-md text-amber-200">Official Guide</span>
                  <h3 className="font-serif font-bold text-lg text-white mt-0.5">Common Prospectus</h3>
                </div>
              </div>

              <div className="flex items-center gap-2 relative z-10">
                <a
                  href={prospectusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-amber-950 hover:bg-amber-100 rounded-xl font-semibold text-xs transition-all shadow flex items-center gap-1.5"
                >
                  <span>View PDF</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {userRole === 'admin' && (
                  <button
                    onClick={() => setIsEditingProspectus(!isEditingProspectus)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors"
                    title="Edit Prospectus URL"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Inline Editor for Admin */}
            {isEditingProspectus && userRole === 'admin' && (
              <div className="bg-amber-100 dark:bg-stone-800 border border-amber-300 dark:border-stone-700 p-4 rounded-2xl shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">Edit Common Prospectus URL</h4>
                  <button onClick={() => setIsEditingProspectus(false)} className="text-stone-500 hover:text-stone-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="Enter Prospectus URL (https://...)"
                    className="flex-grow px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={() => {
                      onUpdateProspectusUrl(tempUrl);
                      setIsEditingProspectus(false);
                    }}
                    className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white/90 dark:bg-stone-900/90 rounded-3xl p-6 shadow-xl border border-amber-200 dark:border-stone-800 relative">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-700 animate-bounce" />
                  <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100">Notice Board</h3>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">Official Updates</span>
              </div>

              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {notices.map((notice) => (
                  <div key={notice.id} className="p-4 rounded-2xl bg-amber-50/70 dark:bg-stone-800/60 border border-amber-200/50 dark:border-stone-700 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-amber-200/60 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 rounded-md">
                        {notice.category}
                      </span>
                      <span className="text-xs text-stone-500">{notice.date}</span>
                    </div>
                    <h4 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{notice.title}</h4>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 line-clamp-2">{notice.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Departments & Seat Status Section - Synchronized with Seat Matrix & DB */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">Academic Portfolios & Live Intake</span>
            <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">Departments & Seat Status</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Synchronized from SAMS Subject & Seat Matrix. Each box contains regular honours and corresponding AEDP courses.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('seat-matrix')}
            className="text-sm font-semibold text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Open Full Seat Matrix</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departmentGroupCards.map((deptCard) => {
            const fillPercentage = Math.round((deptCard.totalFilled / deptCard.totalSanctioned) * 100) || 0;

            return (
              <div 
                key={deptCard.id} 
                className="bg-white dark:bg-stone-900 rounded-3xl p-6 border border-amber-200/80 dark:border-stone-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 bg-amber-100 dark:bg-stone-800 text-amber-900 dark:text-amber-300 text-xs font-bold rounded-xl font-mono border border-amber-200 dark:border-stone-700">
                      {deptCard.code}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      deptCard.totalAvailable > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                    }`}>
                      {deptCard.totalAvailable > 0 ? `${deptCard.totalAvailable} Seats Open` : 'Seats Full'}
                    </span>
                  </div>

                  <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-400 transition-colors">
                    {deptCard.name}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">HOD: <span className="font-medium text-stone-700 dark:text-stone-300">{deptCard.hodName}</span></p>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 line-clamp-2">{deptCard.description}</p>

                  {/* Regular and Corresponding AEDP Courses in One Box */}
                  <div className="mt-4 space-y-3 bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-700/80">
                    {/* Regular Honours Course */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                          <span>Regular Honours</span>
                        </span>
                        <span className="text-xs font-mono font-semibold text-stone-800 dark:text-stone-200">
                          {deptCard.regularCourse.filledSeats} / {deptCard.regularCourse.sanctionedSeats}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-stone-500 dark:text-stone-400">
                        <span>Subject: {deptCard.regularCourse.name}</span>
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          {deptCard.regularCourse.availableSeats} open
                        </span>
                      </div>
                    </div>

                    {/* Corresponding AEDP Course if present */}
                    {deptCard.aedpCourse ? (
                      <div className="pt-2.5 border-t border-stone-200 dark:border-stone-700/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                            <span>Corresponding AEDP Course</span>
                          </span>
                          <span className="text-xs font-mono font-semibold text-amber-900 dark:text-amber-300">
                            {deptCard.aedpCourse.filledSeats} / {deptCard.aedpCourse.sanctionedSeats}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-600 dark:text-stone-300 line-clamp-2 leading-tight">
                          {deptCard.aedpCourse.name}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-stone-500 dark:text-stone-400 pt-0.5">
                          <span>Specialized Industry Stream</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {deptCard.aedpCourse.availableSeats} open
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-stone-200 dark:border-stone-700/80 text-[10px] text-stone-400 dark:text-stone-500 italic">
                        Standard Regular Honours discipline (No corresponding AEDP stream)
                      </div>
                    )}
                  </div>
                </div>

                {/* Combined Progress & Button */}
                <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2.5">
                  <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400 font-medium">
                    <span>Combined Total: {deptCard.totalFilled} / {deptCard.totalSanctioned} Seats</span>
                    <span>{fillPercentage}% Capacity</span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        fillPercentage > 90 ? 'bg-red-600' : 'bg-amber-600'
                      }`} 
                      style={{ width: `${fillPercentage}%` }}
                    ></div>
                  </div>

                  {canSeeSpotRound ? (
                    <button
                      onClick={() => setActiveTab('spot-round')}
                      className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-amber-900 dark:text-amber-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Check Spot Round & Apply</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('seat-matrix')}
                      className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <span>View Seat Matrix</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

