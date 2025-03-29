// Use server-side Timestamp for consistent typing
import { Timestamp } from '../server/firebase-admin';

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: "subject_teacher" | "class_teacher" | "admin";
  email?: string;
  phone?: string;
  avatarInitials: string;
  createdAt: Timestamp;
  lastLogin?: Timestamp;
  assignedClassId?: string; // For class teachers
  assignedSubjectId?: string; // For subject teachers
}

export interface AcademicSession {
  id: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
}

export interface Class {
  id: string;
  name: string; // e.g., "7B"
  teacherId: string; // Reference to the class teacher (called teacherId for compatibility with Firebase)
  sessionId: string; // Reference to academic session
  createdAt: Timestamp;
}

export interface Subject {
  id: string;
  name: string; // e.g., "Science"
  teacherId: string; // Subject teacher ID
  classId: string; // Reference to class ID (needed for Firebase compatibility)
  notebookColor: string; // Color code 
  submissionFrequency: "weekly" | "bi-weekly" | "monthly";
}

// Map subjects to multiple classes
export interface SubjectClassMapping {
  id: string;
  subjectId: string;
  classId: string;
  createdAt: Timestamp;
}

// Map students to multiple subjects
export interface StudentSubjectMapping {
  id: string;
  studentId: string;
  subjectId: string;
  classId: string;
  createdAt: Timestamp;
}

export interface Student {
  id: string;
  fullName: string;
  scholarNumber: string; // 5-digit admission number
  rollNumber: string;
  classId: string;
  parentName: string;
  parentPhone?: string;
  parentEmail?: string;
  avatarInitials: string;
  photoUrl?: string;
  isActive: boolean;
  joinedAt: Timestamp;
}

export interface StudentClassHistory {
  id: string;
  studentId: string;
  oldClassId: string;
  newClassId: string;
  changedAt: Timestamp;
  changedBy: string; // userId
  reason?: string;
}

export interface SubmissionCycle {
  id: string;
  subjectId: string;
  classId: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  name?: string; // e.g., "Week 1", "April 2024"
  status: "active" | "completed";
  createdBy: string; // userId
  createdAt: Timestamp;
}

export interface Submission {
  id: string;
  studentId: string;
  subjectId: string;
  cycleId: string;
  date: Timestamp;
  status: "submitted" | "returned" | "missing";
  submittedAt?: Timestamp;
  returnedAt?: Timestamp;
  notificationSent: boolean;
  notificationSentAt?: Timestamp;
  notes?: string; // Teacher's notes about the submission
  followUpRequired: boolean; // For problematic submissions
  consecutiveMisses: number; // Count of consecutive missed submissions
}

export interface NotificationHistory {
  id: string;
  studentId: string;
  submissionId: string;
  sent: boolean;
  sentAt: Timestamp;
  messageType: "sms" | "email" | "app";
  messageContent: string;
  recipientNumber?: string;
  recipientEmail?: string;
  status: "delivered" | "failed" | "pending";
  errorMessage?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  content: string;
  type: "missing" | "reminder" | "thankyou";
  createdBy: string; // userId
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isDefault: boolean;
}

export interface StudentWithSubmission extends Student {
  submissions: Submission[];
  latestSubmission?: Submission;
  missedCount?: number;
  submittedCount?: number;
  returnedCount?: number;
  consecutiveMisses?: number;
  predictedDefaulter?: boolean;
}

export interface StudentWithHistory extends Student {
  submissions: Submission[];
  previousMissingCount: number;
}

export interface SubjectWithStats extends Subject {
  submissionRate: number;
  totalStudents: number;
  submittedCount: number;
  missingCount: number;
  returnedCount: number;
}

export interface ClassWithStats extends Class {
  studentCount: number;
  subjects: SubjectWithStats[];
  teacher: User;
}

// Input types for creating new objects

export interface UserInput {
  username: string;
  password: string;
  fullName: string;
  role: "subject_teacher" | "class_teacher" | "admin";
  email?: string;
  phone?: string;
  avatarInitials?: string;
  assignedClassId?: string; // For class teachers
  assignedSubjectId?: string; // For subject teachers
}

export interface StudentInput {
  fullName: string;
  scholarNumber: string;
  rollNumber: string;
  classId: string;
  parentName: string;
  parentPhone?: string;
  parentEmail?: string;
  photoUrl?: string;
  isActive?: boolean;
}

export interface ClassInput {
  name: string;
  teacherId: string; // Called teacherId for compatibility with Firebase
  sessionId: string;
}

export interface SubjectInput {
  name: string;
  teacherId: string;
  classId: string; // Class ID for Firebase compatibility
  notebookColor?: string;
  submissionFrequency?: "weekly" | "bi-weekly" | "monthly";
}

export interface SubjectClassMappingInput {
  subjectId: string;
  classId: string;
}

export interface StudentSubjectMappingInput {
  studentId: string;
  subjectId: string;
  classId: string;
}

export interface SubmissionCycleInput {
  subjectId: string;
  classId: string;
  startDate: Date;
  endDate?: Date;
  name?: string;
  createdBy?: string;
}

export interface SubmissionInput {
  studentId: string;
  subjectId: string;
  cycleId: string;
  status: "submitted" | "returned" | "missing";
  notes?: string;
  followUpRequired?: boolean;
}

export interface SessionInput {
  name: string;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
}

export interface NotificationTemplateInput {
  name: string;
  content: string;
  type: "missing" | "reminder" | "thankyou";
  isDefault?: boolean;
  createdBy?: string;
}