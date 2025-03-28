import { pgTable, text, serial, integer, boolean, timestamp, unique, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { Timestamp } from "../server/firebase-admin";

// Define the Firebase types
// Our application uses Firebase types in the actual implementation
// but we also maintain Postgres schema definitions for type safety and potential future migration
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("teacher"), // teacher or admin
  avatarInitials: text("avatar_initials").notNull(), // e.g., "TS" for Tanya Singh
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  avatarInitials: true,
  email: true,
  phone: true,
});

// Academic Sessions
export const academicSessions = pgTable("academic_sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g., "2024-2025"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertAcademicSessionSchema = createInsertSchema(academicSessions).pick({
  name: true,
  startDate: true,
  endDate: true,
  isActive: true,
});

// Classes
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "7B"
  teacherId: integer("teacher_id").references(() => users.id), // class teacher
  sessionId: integer("session_id").references(() => academicSessions.id), // academic session
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => {
  return {
    classSessionUnique: unique().on(table.name, table.sessionId),
  };
});

export const insertClassSchema = createInsertSchema(classes).pick({
  name: true,
  teacherId: true,
  sessionId: true,
});

// Subjects
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Science"
  teacherId: integer("teacher_id").references(() => users.id), // subject teacher
  classId: integer("class_id").references(() => classes.id),
  notebookColor: text("notebook_color").default("#1E88E5"), // Color code for the notebook
  submissionFrequency: text("submission_frequency").default("weekly"), // weekly, bi-weekly, monthly
});

export const insertSubjectSchema = createInsertSchema(subjects).pick({
  name: true,
  teacherId: true,
  classId: true,
  notebookColor: true,
  submissionFrequency: true,
});

// Students
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  scholarNumber: text("scholar_number").notNull().unique(), // 5-digit admission number
  rollNumber: text("roll_number").notNull(),
  classId: integer("class_id").references(() => classes.id),
  parentName: text("parent_name").notNull(),
  parentPhone: text("parent_phone"),
  parentEmail: text("parent_email"),
  avatarInitials: text("avatar_initials").notNull(), // e.g., "AR" for Aditya Raj
  photoUrl: text("photo_url"), // URL to student's photo
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertStudentSchema = createInsertSchema(students).pick({
  fullName: true,
  scholarNumber: true,
  rollNumber: true,
  classId: true,
  parentName: true,
  parentPhone: true,
  parentEmail: true,
  avatarInitials: true,
  photoUrl: true,
  isActive: true,
});

// Student Class History (for tracking class changes)
export const studentClassHistory = pgTable("student_class_history", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id),
  oldClassId: integer("old_class_id").references(() => classes.id),
  newClassId: integer("new_class_id").references(() => classes.id),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  changedBy: integer("changed_by").references(() => users.id),
  reason: text("reason"),
});

export const insertStudentClassHistorySchema = createInsertSchema(studentClassHistory).pick({
  studentId: true,
  oldClassId: true,
  newClassId: true,
  changedBy: true,
  reason: true,
});

// Submission Cycles
export const submissionCycles = pgTable("submission_cycles", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id),
  classId: integer("class_id").references(() => classes.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  name: text("name"), // e.g., "Week 1", "April 2024"
  status: text("status").notNull().default("active"), // active, completed
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSubmissionCycleSchema = createInsertSchema(submissionCycles).pick({
  subjectId: true,
  classId: true,
  startDate: true,
  endDate: true,
  name: true,
  status: true,
  createdBy: true,
});

// Notebook Submissions
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id),
  subjectId: integer("subject_id").references(() => subjects.id),
  cycleId: integer("cycle_id").references(() => submissionCycles.id),
  date: timestamp("date").notNull().defaultNow(),
  status: text("status").notNull(), // submitted, returned, missing
  submittedAt: timestamp("submitted_at"),
  returnedAt: timestamp("returned_at"),
  notificationSent: boolean("notification_sent").default(false),
  notificationSentAt: timestamp("notification_sent_at"),
  notes: text("notes"), // Teacher's notes about the submission
  followUpRequired: boolean("follow_up_required").default(false), // For problematic submissions
  consecutiveMisses: integer("consecutive_misses").default(0), // Count of consecutive missed submissions
});

export const insertSubmissionSchema = createInsertSchema(submissions).pick({
  studentId: true,
  subjectId: true,
  cycleId: true,
  date: true,
  status: true,
  submittedAt: true,
  returnedAt: true,
  notificationSent: true,
  notificationSentAt: true,
  notes: true,
  followUpRequired: true,
  consecutiveMisses: true,
});

// Notification History
export const notificationHistory = pgTable("notification_history", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id),
  submissionId: integer("submission_id").references(() => submissions.id),
  sent: boolean("sent").notNull().default(true),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  messageType: text("message_type").notNull(), // sms, email, app
  messageContent: text("message_content").notNull(),
  recipientNumber: text("recipient_number"),
  recipientEmail: text("recipient_email"),
  status: text("status").notNull(), // delivered, failed, pending
  errorMessage: text("error_message"),
});

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).pick({
  studentId: true,
  submissionId: true,
  sent: true,
  messageType: true,
  messageContent: true,
  recipientNumber: true,
  recipientEmail: true,
  status: true,
  errorMessage: true,
});

// Notification Templates
export const notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  content: text("content").notNull(),
  type: text("type").notNull(), // missing, reminder, thankyou
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isDefault: boolean("is_default").default(false),
});

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).pick({
  name: true,
  content: true,
  type: true,
  createdBy: true,
  isDefault: true,
});

// Firebase Types - These are the actual types used by our application
// User type
export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: 'admin' | 'class_teacher' | 'subject_teacher';
  avatarInitials: string;
  email?: string;
  phone?: string;
  createdAt: Timestamp;
  lastLogin?: Timestamp;
  assignedClassId?: string; // For class teachers
  authUid?: string; // Firebase Auth UID if using Firebase Auth
}

export interface UserInput {
  username: string;
  password: string;
  fullName: string;
  role: 'admin' | 'class_teacher' | 'subject_teacher';
  assignedClassId?: string;
  email?: string;
  phone?: string;
}

// Academic Session type
export interface AcademicSession {
  id: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
}

export interface SessionInput {
  name: string;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
}

// Class type
export interface Class {
  id: string;
  name: string;
  teacherId: string; // Class teacher ID
  sessionId: string; // Academic session ID
  createdAt: Timestamp;
}

export interface ClassInput {
  name: string;
  teacherId: string;
  sessionId: string;
}

// Subject type
export interface Subject {
  id: string;
  name: string;
  teacherId: string;
  classId: string;
  notebookColor: string;
  submissionFrequency: 'weekly' | 'bi-weekly' | 'monthly';
}

export interface SubjectInput {
  name: string;
  teacherId: string;
  classId: string;
  notebookColor?: string;
  submissionFrequency?: 'weekly' | 'bi-weekly' | 'monthly';
}

// Student type
export interface Student {
  id: string;
  fullName: string;
  scholarNumber: string; // 5-digit admission number
  rollNumber: number;
  classId: string;
  parentName: string;
  parentPhone?: string;
  parentEmail?: string;
  avatarInitials: string;
  photoUrl?: string;
  joinedAt: Timestamp;
  isActive: boolean;
}

export interface StudentInput {
  fullName: string;
  scholarNumber: string;
  rollNumber: number;
  classId: string;
  parentName: string;
  parentPhone?: string;
  parentEmail?: string;
  photoUrl?: string;
  isActive?: boolean;
}

// Student Class History type
export interface StudentClassHistory {
  id: string;
  studentId: string;
  oldClassId: string;
  newClassId: string;
  changedAt: Timestamp;
  changedBy: string; // User ID or 'system'
  reason?: string;
}

// Submission Cycle type
export interface SubmissionCycle {
  id: string;
  subjectId: string;
  classId: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  name?: string;
  status: 'active' | 'completed';
  createdBy: string; // User ID
  createdAt: Timestamp;
}

export interface SubmissionCycleInput {
  subjectId: string;
  classId: string;
  startDate: Date;
  endDate?: Date;
  name?: string;
  createdBy?: string;
}

// Submission type
export interface Submission {
  id: string;
  studentId: string;
  subjectId: string;
  cycleId: string;
  date: Timestamp;
  status: 'submitted' | 'returned' | 'missing';
  submittedAt?: Timestamp;
  returnedAt?: Timestamp;
  notificationSent: boolean;
  notificationSentAt?: Timestamp;
  notes?: string;
  followUpRequired: boolean;
  consecutiveMisses: number;
}

export interface SubmissionInput {
  studentId: string;
  subjectId: string;
  cycleId: string;
  status: 'submitted' | 'returned' | 'missing';
  submittedAt?: Date;
  returnedAt?: Date;
  notes?: string;
  followUpRequired?: boolean;
  consecutiveMisses?: number;
}

// Notification History type
export interface NotificationHistory {
  id: string;
  studentId: string;
  submissionId?: string;
  sent: boolean;
  sentAt: Timestamp;
  messageType: 'sms' | 'email' | 'app';
  messageContent: string;
  recipientNumber?: string;
  recipientEmail?: string;
  status: 'delivered' | 'failed' | 'pending';
  errorMessage?: string;
}

// Notification Template type
export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'submission_reminder' | 'missing_submission' | 'defaulter_alert';
  subject: string;
  template: string;
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  isDefault?: boolean;
}

export interface NotificationTemplateInput {
  name: string;
  type: string;
  subject: string;
  template: string;
  createdBy?: string;
  isDefault?: boolean;
}

// Postgres Schema Types (for reference) - These aren't used directly
export type PgUser = typeof users.$inferSelect;
export type PgInsertUser = z.infer<typeof insertUserSchema>;

export type PgAcademicSession = typeof academicSessions.$inferSelect;
export type PgInsertAcademicSession = z.infer<typeof insertAcademicSessionSchema>;

export type PgClass = typeof classes.$inferSelect;
export type PgInsertClass = z.infer<typeof insertClassSchema>;

export type PgSubject = typeof subjects.$inferSelect;
export type PgInsertSubject = z.infer<typeof insertSubjectSchema>;

export type PgStudent = typeof students.$inferSelect;
export type PgInsertStudent = z.infer<typeof insertStudentSchema>;

export type PgStudentClassHistory = typeof studentClassHistory.$inferSelect;
export type PgInsertStudentClassHistory = z.infer<typeof insertStudentClassHistorySchema>;

export type PgSubmissionCycle = typeof submissionCycles.$inferSelect;
export type PgInsertSubmissionCycle = z.infer<typeof insertSubmissionCycleSchema>;

export type PgSubmission = typeof submissions.$inferSelect;
export type PgInsertSubmission = z.infer<typeof insertSubmissionSchema>;

export type PgNotificationHistory = typeof notificationHistory.$inferSelect;
export type PgInsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;

export type PgNotificationTemplate = typeof notificationTemplates.$inferSelect;
export type PgInsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;

// Special types for the frontend
export type SubmissionWithDetails = Submission & {
  student: Student;
  subject: Subject;
};

export type StudentWithSubmission = Student & {
  submissions: Submission[];
  latestSubmission?: Submission;
  missedCount?: number;
  submittedCount?: number;
  returnedCount?: number;
  consecutiveMisses?: number;
  defaultProbability?: number;
  historyPattern?: string;
};

export type SubjectWithStats = Subject & {
  submissionRate: number;
  totalStudents: number;
  submittedCount: number;
  missingCount: number;
  returnedCount: number;
  teacher?: User;
};

export type ClassWithStats = Class & {
  studentCount: number;
  subjects: SubjectWithStats[];
  teacher: User;
};

// Advanced AI prediction types
export interface DefaulterPrediction {
  studentId: string;
  studentName: string;
  scholarNumber: string;
  defaultProbability: number;
  missingCount: number;
  historyPattern: string;
  reasoning: string[];
}

// Collection names
export const collections = {
  USERS: 'users',
  SESSIONS: 'academic_sessions',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  STUDENTS: 'students',
  STUDENT_CLASS_HISTORY: 'student_class_history',
  SUBMISSION_CYCLES: 'submission_cycles',
  SUBMISSIONS: 'submissions',
  NOTIFICATION_HISTORY: 'notification_history',
  NOTIFICATION_TEMPLATES: 'notification_templates'
};
