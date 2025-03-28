import { pgTable, text, serial, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users (teachers and admins)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("teacher"), // teacher or admin
  avatarInitials: text("avatar_initials").notNull(), // e.g., "TS" for Tanya Singh
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  avatarInitials: true,
});

// Classes
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g., "7B"
  teacherId: integer("teacher_id").references(() => users.id), // class teacher
});

export const insertClassSchema = createInsertSchema(classes).pick({
  name: true,
  teacherId: true,
});

// Subjects
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Science"
  teacherId: integer("teacher_id").references(() => users.id), // subject teacher
  classId: integer("class_id").references(() => classes.id),
});

export const insertSubjectSchema = createInsertSchema(subjects).pick({
  name: true,
  teacherId: true,
  classId: true,
});

// Students
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  rollNumber: text("roll_number").notNull(),
  classId: integer("class_id").references(() => classes.id),
  parentName: text("parent_name").notNull(),
  parentPhone: text("parent_phone"),
  avatarInitials: text("avatar_initials").notNull(), // e.g., "AR" for Aditya Raj
});

export const insertStudentSchema = createInsertSchema(students).pick({
  fullName: true,
  rollNumber: true,
  classId: true,
  parentName: true,
  parentPhone: true,
  avatarInitials: true,
});

// Notebook Submissions
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id),
  subjectId: integer("subject_id").references(() => subjects.id),
  date: timestamp("date").notNull().defaultNow(),
  status: text("status").notNull(), // submitted, returned, missing
  submittedAt: timestamp("submitted_at"),
  returnedAt: timestamp("returned_at"),
  notificationSent: boolean("notification_sent").default(false),
});

export const insertSubmissionSchema = createInsertSchema(submissions).pick({
  studentId: true,
  subjectId: true,
  date: true,
  status: true,
  submittedAt: true,
  returnedAt: true,
  notificationSent: true,
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

// Special types for the frontend
export type SubmissionWithDetails = Submission & {
  student: Student;
  subject: Subject;
};

export type StudentWithSubmission = Student & {
  submissions: Submission[];
};
