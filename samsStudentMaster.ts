import { Student } from '../types';
import rawStudents from './samsStudents.json';

// Sorted by roll number in dictionary order (A-Z)
export const SAMS_MASTER_STUDENTS: Student[] = ([...(rawStudents as Student[])]).sort((a, b) =>
  (a.rollNumber || '').localeCompare(b.rollNumber || '')
);
