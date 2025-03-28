import session from "express-session";
import type {
  User, Student, Class, Subject, Submission, 
  SubmissionCycle, NotificationTemplate, NotificationHistory,
  AcademicSession, StudentClassHistory, StudentWithSubmission,
  ClassWithStats, SubjectWithStats, UserInput, StudentInput,
  ClassInput, SubjectInput, SubmissionInput, SubmissionCycleInput,
  SessionInput, NotificationTemplateInput
} from "@shared/firebase-types";

export interface IStorage {
  // Session store for Express
  sessionStore: session.Store;

  // User management
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  createUser(user: UserInput): Promise<User>;
  updateUser(id: string, userData: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;

  // Academic session management
  getSession(id: string): Promise<AcademicSession | null>;
  getSessions(): Promise<AcademicSession[]>;
  getActiveSession(): Promise<AcademicSession | null>;
  createSession(sessionData: SessionInput): Promise<AcademicSession>;
  updateSession(id: string, sessionData: Partial<AcademicSession>): Promise<AcademicSession>;
  setActiveSession(id: string): Promise<AcademicSession>;

  // Class management
  getClass(id: string): Promise<Class | null>;
  getClasses(): Promise<Class[]>;
  getClassesByTeacherId(teacherId: string): Promise<Class[]>;
  getClassesBySession(sessionId: string): Promise<Class[]>;
  createClass(classData: ClassInput): Promise<Class>;
  updateClass(id: string, classData: Partial<Class>): Promise<Class>;
  getClassWithStats(id: string): Promise<ClassWithStats | null>;

  // Subject management
  getSubject(id: string): Promise<Subject | null>;
  getSubjects(): Promise<Subject[]>;
  getSubjectsByTeacherId(teacherId: string): Promise<Subject[]>;
  getSubjectsByClassId(classId: string): Promise<Subject[]>;
  createSubject(subject: SubjectInput): Promise<Subject>;
  updateSubject(id: string, subjectData: Partial<Subject>): Promise<Subject>;
  getSubjectWithStats(id: string, cycleId?: string): Promise<SubjectWithStats | null>;

  // Student management
  getStudent(id: string): Promise<Student | null>;
  getStudents(): Promise<Student[]>;
  getStudentsByClassId(classId: string): Promise<Student[]>;
  getStudentByScholarNumber(scholarNumber: string): Promise<Student | null>;
  createStudent(student: StudentInput): Promise<Student>;
  updateStudent(id: string, studentData: Partial<Student>): Promise<Student>;
  changeStudentClass(studentId: string, newClassId: string, reason?: string, changedBy?: string): Promise<Student>;
  getStudentClassHistory(studentId: string): Promise<StudentClassHistory[]>;

  // Submission cycle management
  getSubmissionCycle(id: string): Promise<SubmissionCycle | null>;
  getActiveSubmissionCycle(subjectId: string, classId: string): Promise<SubmissionCycle | null>;
  getSubmissionCyclesBySubject(subjectId: string): Promise<SubmissionCycle[]>;
  createSubmissionCycle(cycleData: SubmissionCycleInput): Promise<SubmissionCycle>;
  completeSubmissionCycle(id: string): Promise<SubmissionCycle>;

  // Submission management
  getSubmission(id: string): Promise<Submission | null>;
  getSubmissionsByDate(date: Date): Promise<Submission[]>;
  getSubmissionsByCycle(cycleId: string): Promise<Submission[]>;
  getSubmissionsForStudent(studentId: string): Promise<Submission[]>;
  getSubmissionsForStudentAndSubject(studentId: string, subjectId: string): Promise<Submission[]>;
  getSubmissionsForClassAndSubject(classId: string, subjectId: string, cycleId?: string): Promise<Submission[]>;
  getSubmissionsWithStatus(status: string, classId?: string, subjectId?: string, cycleId?: string): Promise<Submission[]>;
  createSubmission(submission: SubmissionInput): Promise<Submission>;
  updateSubmission(id: string, submission: Partial<Submission>): Promise<Submission>;
  markSubmissionAsReturned(id: string): Promise<Submission>;
  markAllSubmissionsAsReturned(cycleId: string): Promise<number>;
  getStudentsWithSubmissions(classId: string, subjectId: string, cycleId?: string): Promise<StudentWithSubmission[]>;

  // Analytics
  getSubmissionAnalytics(classId: string, subjectId: string, startDate: Date, endDate: Date): Promise<any>;
  getPotentialDefaulters(classId: string, threshold?: number): Promise<StudentWithSubmission[]>;
  getStudentsWithHistory(classId: string): Promise<Array<Student & { submissions: Submission[]; previousMissingCount: number; }>>;

  // Notification management
  getNotificationTemplate(id: string): Promise<NotificationTemplate | null>;
  getNotificationTemplates(): Promise<NotificationTemplate[]>;
  getNotificationTemplateByType(type: string): Promise<NotificationTemplate | null>;
  createNotificationTemplate(template: NotificationTemplateInput): Promise<NotificationTemplate>;
  updateNotificationTemplate(id: string, template: Partial<NotificationTemplate>): Promise<NotificationTemplate>;
  getNotificationHistory(id: string): Promise<NotificationHistory | null>;
  getNotificationHistoryByStudent(studentId: string): Promise<NotificationHistory[]>;
  createNotificationHistory(notification: Partial<NotificationHistory>): Promise<NotificationHistory>;
}

// Import the FirebaseStorage
import { FirebaseStorage } from './firebase-storage';

// Export the FirebaseStorage instance
export const storage = new FirebaseStorage();