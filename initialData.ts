import { Department, Faculty, Notice, Application, Student } from './types';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-odia',
    name: 'Department of Odia',
    code: 'ODIA',
    hodName: 'Dr. B. K. Sahu',
    hodEmail: 'hod.odia@samspanchayat.edu.in',
    totalSeats: 64,
    filledSeats: 61,
    description: 'Offering Honours and Postgraduate studies in Odia Language, Literature, and Cultural Heritage.'
  },
  {
    id: 'dept-eng',
    name: 'Department of English',
    code: 'ENG',
    hodName: 'Prof. S. Pradhan',
    hodEmail: 'hod.english@samspanchayat.edu.in',
    totalSeats: 64,
    filledSeats: 63,
    description: 'Focusing on World Literature, Linguistics, Creative Writing, and Communication Skills.'
  },
  {
    id: 'dept-ps',
    name: 'Department of Political Science',
    code: 'PS',
    hodName: 'Dr. S. K. Meher',
    hodEmail: 'hod.ps@samspanchayat.edu.in',
    totalSeats: 64,
    filledSeats: 62,
    description: 'Study of Indian Constitution, Political Theory, International Relations, and Public Administration.'
  },
  {
    id: 'dept-hist',
    name: 'Department of History',
    code: 'HIST',
    hodName: 'Dr. R. N. Panda',
    hodEmail: 'hod.history@samspanchayat.edu.in',
    totalSeats: 64,
    filledSeats: 60,
    description: 'Ancient, Medieval, Modern Indian History, World History, and Tourism & Hospitality Operations.'
  },
  {
    id: 'dept-eco',
    name: 'Department of Economics',
    code: 'ECO',
    hodName: 'Prof. P. K. Sahoo',
    hodEmail: 'hod.eco@samspanchayat.edu.in',
    totalSeats: 48,
    filledSeats: 45,
    description: 'Microeconomics, Macroeconomics, Quantitative Economics, and Data Analytics.'
  },
  {
    id: 'dept-phil',
    name: 'Department of Philosophy',
    code: 'PHIL',
    hodName: 'Dr. Anita Dash',
    hodEmail: 'hod.phil@samspanchayat.edu.in',
    totalSeats: 32,
    filledSeats: 30,
    description: 'Indian Philosophy, Western Philosophy, Logic, and Ethics.'
  },
  {
    id: 'dept-sans',
    name: 'Department of Sanskrit',
    code: 'SANS',
    hodName: 'Dr. B. Mishra',
    hodEmail: 'hod.sanskrit@samspanchayat.edu.in',
    totalSeats: 32,
    filledSeats: 31,
    description: 'Classical Sanskrit Literature, Vedic Studies, Grammar, and Indian Epics.'
  },
  {
    id: 'dept-hindi',
    name: 'Department of Hindi',
    code: 'HINDI',
    hodName: 'Prof. M. Devi',
    hodEmail: 'hod.hindi@samspanchayat.edu.in',
    totalSeats: 48,
    filledSeats: 46,
    description: 'Hindi Sahitya, Poetry, Drama, and Modern Literary Criticism.'
  },
  {
    id: 'dept-educ',
    name: 'Department of Education',
    code: 'EDUC',
    hodName: 'Dr. K. N. Jena',
    hodEmail: 'hod.edu@samspanchayat.edu.in',
    totalSeats: 48,
    filledSeats: 45,
    description: 'Educational Psychology, Pedagogy, Curriculum Studies, and Educational Technology.'
  },
  {
    id: 'dept-socio',
    name: 'Department of Sociology',
    code: 'SOCIO',
    hodName: 'Prof. R. Behera',
    hodEmail: 'hod.socio@samspanchayat.edu.in',
    totalSeats: 48,
    filledSeats: 44,
    description: 'Sociological Theory, Indian Society, Social Research Methods, and Rural Sociology.'
  },
  {
    id: 'dept-geog',
    name: 'Department of Geography',
    code: 'GEOG',
    hodName: 'Dr. P. Sahu',
    hodEmail: 'hod.geog@samspanchayat.edu.in',
    totalSeats: 48,
    filledSeats: 46,
    description: 'Physical Geography, Human Geography, Cartography, and GIS Applications.'
  },
  {
    id: 'dept-psych',
    name: 'Department of Psychology',
    code: 'PSYCH',
    hodName: 'Dr. S. Mohapatra',
    hodEmail: 'hod.psych@samspanchayat.edu.in',
    totalSeats: 32,
    filledSeats: 31,
    description: 'General Psychology, Developmental Psychology, Abnormal Psychology, and Counseling.'
  },
  {
    id: 'dept-physics',
    name: 'Department of Physics',
    code: 'PHY',
    hodName: 'Dr. M. R. Mishra',
    hodEmail: 'hod.physics@samspanchayat.edu.in',
    totalSeats: 48,
    filledSeats: 47,
    description: 'Quantum Mechanics, Electrodynamics, Electronics, and Solid State Physics.'
  },
  {
    id: 'dept-chem',
    name: 'Department of Chemistry',
    code: 'CHEM',
    hodName: 'Dr. Anita Dash',
    hodEmail: 'hod.chem@samspanchayat.edu.in',
    totalSeats: 48,
    filledSeats: 46,
    description: 'Organic, Inorganic, Physical Chemistry, and Industrial Chemistry.'
  },
  {
    id: 'dept-math',
    name: 'Department of Mathematics',
    code: 'MATH',
    hodName: 'Prof. R. N. Patel',
    hodEmail: 'hod.math@samspanchayat.edu.in',
    totalSeats: 32,
    filledSeats: 29,
    description: 'Algebra, Real Analysis, Differential Equations, and Mathematics & Computing.'
  },
  {
    id: 'dept-bot',
    name: 'Department of Botany',
    code: 'BOT',
    hodName: 'Dr. S. K. Pradhan',
    hodEmail: 'hod.botany@samspanchayat.edu.in',
    totalSeats: 32,
    filledSeats: 31,
    description: 'Plant Physiology, Genetics, Biotechnology, Tissue Culture, and Vertical Gardening.'
  },
  {
    id: 'dept-zoo',
    name: 'Department of Zoology',
    code: 'ZOO',
    hodName: 'Dr. L. N. Patel',
    hodEmail: 'hod.zoology@samspanchayat.edu.in',
    totalSeats: 32,
    filledSeats: 32,
    description: 'Animal Physiology, Cell Biology, Ecology, and Integrative Bioscience.'
  },
  {
    id: 'dept-stat',
    name: 'Department of Statistics',
    code: 'STAT',
    hodName: 'Prof. B. Dash',
    hodEmail: 'hod.stat@samspanchayat.edu.in',
    totalSeats: 32,
    filledSeats: 30,
    description: 'Probability Theory, Statistical Inference, and Applied Data Analysis.'
  },
  {
    id: 'dept-cs',
    name: 'Department of Computer Science (Self Financing)',
    code: 'CS',
    hodName: 'Prof. A. K. Rout',
    hodEmail: 'hod.cs@samspanchayat.edu.in',
    totalSeats: 64,
    filledSeats: 62,
    description: 'Programming, Data Structures, Algorithms, Software Engineering, and Web Technologies.'
  },
  {
    id: 'dept-comm',
    name: 'Department of Commerce',
    code: 'COMM',
    hodName: 'Dr. P. K. Jena',
    hodEmail: 'hod.comm@samspanchayat.edu.in',
    totalSeats: 192,
    filledSeats: 185,
    description: 'Financial Accounting, Corporate Law, Banking, Financial Services & Insurance (BFSI).'
  }
];

export const INITIAL_NOTICES: Notice[] = [
  {
    id: 'n1',
    title: 'UG E-Admission Spot Round 2026 Live Now!',
    content: 'Spot round admission for remaining vacant seats across all 20 departments is currently active.',
    date: '2026-10-10',
    category: 'Spot Round',
    important: true
  },
  {
    id: 'n2',
    title: 'Mandatory Document Verification Schedule',
    content: 'Selected candidates must report to the college academic block with original SLC, Marksheet, and Aadhaar card.',
    date: '2026-10-08',
    category: 'Admission',
    important: true
  },
  {
    id: 'n3',
    title: 'Google Sheets Live Sync Enabled',
    content: 'All 1,097 student records have been successfully synchronized with official SAMS e-Admission records.',
    date: '2026-10-05',
    category: 'General'
  }
];

export const INITIAL_FACULTY: Faculty[] = [
  { id: 'f1', name: 'Dr. B. K. Sahu', departmentId: 'dept-odia', departmentName: 'Odia', designation: 'Professor & HOD', facultyType: 'HOD', email: 'hod.odia@samspanchayat.edu.in', phone: '+91 9437012345' },
  { id: 'f2', name: 'Prof. S. Pradhan', departmentId: 'dept-eng', departmentName: 'English', designation: 'Associate Professor & HOD', facultyType: 'HOD', email: 'hod.english@samspanchayat.edu.in', phone: '+91 9437012346' },
  { id: 'f3', name: 'Dr. M. R. Mishra', departmentId: 'dept-physics', departmentName: 'Physics', designation: 'Professor & HOD', facultyType: 'HOD', email: 'hod.physics@samspanchayat.edu.in', phone: '+91 9437012347' },
  { id: 'f4', name: 'Dr. Anita Dash', departmentId: 'dept-chem', departmentName: 'Chemistry', designation: 'Reader & HOD', facultyType: 'HOD', email: 'hod.chem@samspanchayat.edu.in', phone: '+91 9437012348' },
  { id: 'f5', name: 'Prof. R. N. Patel', departmentId: 'dept-math', departmentName: 'Mathematics', designation: 'Professor & HOD', facultyType: 'HOD', email: 'hod.math@samspanchayat.edu.in', phone: '+91 9437012349' },
  { id: 'f6', name: 'Dr. P. K. Jena', departmentId: 'dept-comm', departmentName: 'Commerce', designation: 'Professor & HOD', facultyType: 'HOD', email: 'hod.comm@samspanchayat.edu.in', phone: '+91 9437012350' },
  { id: 'f7', name: 'Dr. S. K. Mahapatra', departmentId: 'dept-botany', departmentName: 'Botany', designation: 'Associate Professor', facultyType: 'Regular Faculty', email: 'sk.mahapatra@samspanchayat.edu.in', phone: '+91 9437012351' },
  { id: 'f8', name: 'Dr. Meena Rani Sahoo', departmentId: 'dept-zoology', departmentName: 'Zoology', designation: 'Assistant Professor', facultyType: 'Regular Faculty', email: 'meena.sahoo@samspanchayat.edu.in', phone: '+91 9437012352' },
  { id: 'f9', name: 'Prof. Debashis Swain', departmentId: 'dept-cs', departmentName: 'Computer Science', designation: 'Guest Lecturer', facultyType: 'Guest Faculty', email: 'd.swain@samspanchayat.edu.in', phone: '+91 9437012353' },
  { id: 'f10', name: 'Dr. Sunita Tripathy', departmentId: 'dept-sanskrit', departmentName: 'Sanskrit', designation: 'Guest Faculty', facultyType: 'Guest Faculty', email: 'sunita.tripathy@samspanchayat.edu.in', phone: '+91 9437012354' }
];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_APPLICATIONS: Application[] = [
  { id: 'app-1', applicationNumber: 'SAMS-2026-8812', studentName: 'Rakesh Roshan', email: 'rakesh.roshan@gmail.com', phone: '+91 9776123456', departmentId: 'dept-physics', departmentName: 'Physics', percentage: 91.4, category: 'General', status: 'Approved', round: 'Spot Round 1', createdAt: '2026-10-09' },
  { id: 'app-2', applicationNumber: 'SAMS-2026-8813', studentName: 'Lipsita Jena', email: 'lipsita.jena@gmail.com', phone: '+91 9776123457', departmentId: 'dept-math', departmentName: 'Mathematics', percentage: 88.5, category: 'OBC', status: 'Pending', round: 'Spot Round 1', createdAt: '2026-10-10' }
];
