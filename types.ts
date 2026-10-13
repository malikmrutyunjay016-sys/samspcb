export interface Department {
  id: string;
  name: string;
  code: string;
  hodName: string;
  hodEmail: string;
  totalSeats: number;
  filledSeats: number;
  description: string;
  curriculumUrl?: string;
  regularSyllabusUrl?: string;
  aedpSyllabusUrl?: string;
}

export interface Application {
  id: string;
  applicationNumber: string;
  studentName: string;
  email: string;
  phone: string;
  departmentId: string;
  departmentName: string;
  percentage: number;
  category: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Enrolled';
  round: 'Spot Round 1' | 'Spot Round 2' | 'Phase 1' | 'Phase 2';
  createdAt: string;
}

export interface Student {
  id: string;
  rollNumber: string;
  barcode: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  gender: 'Female' | 'Male';
  category?: 'GEN' | 'SC' | 'ST' | 'SEBC' | 'OBC' | string;
  pwd?: boolean;
  pwdType?: string;
  stream: string;
  departmentId: string;
  departmentName: string;
  subject: string;
  semester: string;
  admissionDate?: string;
  universityRollNumber?: string;
  fatherName?: string;
  motherName?: string;
  parentsName?: string;
  aadhaarCard?: string;
  lastModified?: number;
  // Student ID fields
  apaarId?: string;
  myBharatId?: string;
  antiRaggingId?: string;
  // Subject Counselling - Regular course
  counsellingMajor?: string;
  counsellingMinor1?: string;
  counsellingMinor2?: string;
  counsellingAec?: string;
  counsellingSec?: string;
  counsellingMdc?: string;
  // Subject Counselling - AEDP course
  counsellingAedpMajor1?: string;
  counsellingAedpMajor2?: string;
  counsellingAedpMdc1?: string;
  counsellingAedpMdc2?: string;
  counsellingAedpSec1?: string;
  counsellingAedpSec2?: string;
}

export interface SubjectInfo {
  code: string;
  name: string;
  stream: string;
  isAedp: boolean;
  totalSeats: number;
  admittedCount: number;
  vacancy: number;
}

export interface Faculty {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  designation: string;
  email: string;
  phone: string;
  facultyType?: 'HOD' | 'Regular Faculty' | 'Guest Faculty';
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  category: 'Admission' | 'Spot Round' | 'General' | 'Exam';
  important?: boolean;
}

export interface SyncSourceSettings {
  recentMethod: 'method1_url' | 'method2_file';
  recentMethodTimestamp: string;
  savedUrl?: string;
  urlLastSyncedAt?: string;
  urlStudentCount?: number;
  autoSyncEveryMinute?: boolean;
  savedFileName?: string;
  savedFileSize?: number;
  fileLastUploadedAt?: string;
  fileStudentCount?: number;
  savedFileStudents?: Student[];
  savedUrlStudents?: Student[];
}
