import {
  User, Class, Subject, Student, Submission, 
  SubmissionCycle, StudentClassHistory, StudentWithSubmission,
  SubjectWithStats, ClassWithStats, NotificationTemplate,
  NotificationHistory, AcademicSession, UserInput, StudentInput,
  ClassInput, SubjectInput, SubmissionInput, SubmissionCycleInput,
  SessionInput, NotificationTemplateInput
} from '@shared/firebase-types';
import { db } from './db';
import { auth } from './firebase-admin';
import { storage as firebaseStorage } from './firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import memorystore from 'memorystore';

const collections = {
  USERS: 'users',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  STUDENTS: 'students',
  STUDENT_CLASS_HISTORY: 'student_class_history',
  SUBMISSIONS: 'submissions',
  SUBMISSION_CYCLES: 'submission_cycles',
  NOTIFICATION_TEMPLATES: 'notification_templates',
  NOTIFICATION_HISTORY: 'notification_history', 
  SESSIONS: 'academic_sessions'
};

const MemoryStore = memorystore(session);

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

export class FirebaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Using memory store for sessions as a temporary solution
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // Helper methods for working with Firestore
  private generateId(): string {
    return uuidv4();
  }

  private getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .map(name => name.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  private async getDocumentById<T>(collection: string, id: string): Promise<T | null> {
    try {
      const docRef = db.collection(collection).doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      return { id: doc.id, ...doc.data() } as T;
    } catch (error) {
      console.error(`Error getting document from ${collection}:`, error);
      throw error;
    }
  }

  private async getAllDocuments<T>(collection: string): Promise<T[]> {
    try {
      const snapshot = await db.collection(collection).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error(`Error getting all documents from ${collection}:`, error);
      throw error;
    }
  }

  private async queryDocuments<T>(
    collection: string, 
    fieldPath: string, 
    opStr: admin.firestore.WhereFilterOp, 
    value: any
  ): Promise<T[]> {
    try {
      const snapshot = await db.collection(collection).where(fieldPath, opStr, value).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      console.error(`Error querying documents from ${collection}:`, error);
      throw error;
    }
  }

  private async createDocument<T>(collection: string, data: any): Promise<T> {
    try {
      const id = this.generateId();
      const docRef = db.collection(collection).doc(id);
      await docRef.set(data);
      
      return { id, ...data } as T;
    } catch (error) {
      console.error(`Error creating document in ${collection}:`, error);
      throw error;
    }
  }

  private async updateDocument<T>(collection: string, id: string, data: any): Promise<T> {
    try {
      const docRef = db.collection(collection).doc(id);
      await docRef.update(data);
      
      const updatedDoc = await docRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() } as T;
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, error);
      throw error;
    }
  }

  // User management
  async getUser(id: string): Promise<User | null> {
    return this.getDocumentById<User>(collections.USERS, id);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const users = await this.queryDocuments<User>(collections.USERS, 'username', '==', username);
    return users.length > 0 ? users[0] : null;
  }

  async createUser(userData: UserInput): Promise<User> {
    const avatarInitials = this.getInitials(userData.fullName);
    
    try {
      // Create the Firebase Auth user if we're using Firebase Auth
      // Prepare user data without undefined fields that would cause Firestore errors
      const newUser: Omit<User, 'id'> = {
        username: userData.username,
        password: userData.password, // Include the password!
        fullName: userData.fullName,
        role: userData.role,
        email: userData.email,
        phone: userData.phone,
        avatarInitials,
        createdAt: Timestamp.now()
      };
      
      return this.createDocument<User>(collections.USERS, newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    // Generate new initials if fullName was updated
    if (userData.fullName) {
      userData.avatarInitials = this.getInitials(userData.fullName);
    }
    
    return this.updateDocument<User>(collections.USERS, id, userData);
  }

  async getAllUsers(): Promise<User[]> {
    return this.getAllDocuments<User>(collections.USERS);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return this.queryDocuments<User>(collections.USERS, 'role', '==', role);
  }

  // Academic session management
  async getSession(id: string): Promise<AcademicSession | null> {
    return this.getDocumentById<AcademicSession>(collections.SESSIONS, id);
  }

  async getSessions(): Promise<AcademicSession[]> {
    return this.getAllDocuments<AcademicSession>(collections.SESSIONS);
  }

  async getActiveSession(): Promise<AcademicSession | null> {
    const sessions = await this.queryDocuments<AcademicSession>(collections.SESSIONS, 'isActive', '==', true);
    return sessions.length > 0 ? sessions[0] : null;
  }

  async createSession(sessionData: SessionInput): Promise<AcademicSession> {
    const newSession: Omit<AcademicSession, 'id'> = {
      name: sessionData.name,
      startDate: Timestamp.fromDate(sessionData.startDate),
      endDate: Timestamp.fromDate(sessionData.endDate),
      isActive: sessionData.isActive || false
    };
    
    // If this session is active, deactivate all other sessions
    if (newSession.isActive) {
      const batch = db.batch();
      const activeSessions = await this.queryDocuments<AcademicSession>(
        collections.SESSIONS, 
        'isActive', 
        '==', 
        true
      );
      
      activeSessions.forEach(session => {
        const docRef = db.collection(collections.SESSIONS).doc(session.id);
        batch.update(docRef, { isActive: false });
      });
      
      await batch.commit();
    }
    
    return this.createDocument<AcademicSession>(collections.SESSIONS, newSession);
  }

  async updateSession(id: string, sessionData: Partial<AcademicSession>): Promise<AcademicSession> {
    // Convert Date objects to Timestamps
    if (sessionData.startDate && !(sessionData.startDate instanceof Timestamp)) {
      sessionData.startDate = Timestamp.fromDate(new Date(sessionData.startDate));
    }
    
    if (sessionData.endDate && !(sessionData.endDate instanceof Timestamp)) {
      sessionData.endDate = Timestamp.fromDate(new Date(sessionData.endDate));
    }
    
    // If this session is being set to active, deactivate all other sessions
    if (sessionData.isActive) {
      const batch = db.batch();
      const activeSessions = await this.queryDocuments<AcademicSession>(
        collections.SESSIONS, 
        'isActive', 
        '==', 
        true
      );
      
      activeSessions.forEach(session => {
        if (session.id !== id) {
          const docRef = db.collection(collections.SESSIONS).doc(session.id);
          batch.update(docRef, { isActive: false });
        }
      });
      
      await batch.commit();
    }
    
    return this.updateDocument<AcademicSession>(collections.SESSIONS, id, sessionData);
  }

  async setActiveSession(id: string): Promise<AcademicSession> {
    const batch = db.batch();
    
    // Deactivate all sessions
    const sessions = await this.getAllDocuments<AcademicSession>(collections.SESSIONS);
    
    sessions.forEach(session => {
      const docRef = db.collection(collections.SESSIONS).doc(session.id);
      batch.update(docRef, { isActive: session.id === id });
    });
    
    await batch.commit();
    
    const activeSession = await this.getSession(id);
    if (!activeSession) {
      throw new Error(`Session with ID ${id} not found`);
    }
    
    return activeSession;
  }

  // Class management
  async getClass(id: string): Promise<Class | null> {
    return this.getDocumentById<Class>(collections.CLASSES, id);
  }

  async getClasses(): Promise<Class[]> {
    return this.getAllDocuments<Class>(collections.CLASSES);
  }

  async getClassesByTeacherId(teacherId: string): Promise<Class[]> {
    return this.queryDocuments<Class>(collections.CLASSES, 'teacherId', '==', teacherId);
  }

  async getClassesBySession(sessionId: string): Promise<Class[]> {
    return this.queryDocuments<Class>(collections.CLASSES, 'sessionId', '==', sessionId);
  }

  async createClass(classData: ClassInput): Promise<Class> {
    const newClass: Omit<Class, 'id'> = {
      name: classData.name,
      teacherId: classData.teacherId,
      sessionId: classData.sessionId,
      createdAt: Timestamp.now()
    };
    
    return this.createDocument<Class>(collections.CLASSES, newClass);
  }

  async updateClass(id: string, classData: Partial<Class>): Promise<Class> {
    return this.updateDocument<Class>(collections.CLASSES, id, classData);
  }

  async getClassWithStats(id: string): Promise<ClassWithStats | null> {
    const classEntity = await this.getClass(id);
    if (!classEntity) return null;
    
    const students = await this.getStudentsByClassId(id);
    const subjects = await this.getSubjectsByClassId(id);
    const teacher = await this.getUser(classEntity.teacherId);
    
    if (!teacher) {
      throw new Error(`Teacher with ID ${classEntity.teacherId} not found`);
    }
    
    // Get stats for each subject
    const subjectsWithStats: SubjectWithStats[] = await Promise.all(
      subjects.map(async subject => {
        const stats = await this.getSubjectWithStats(subject.id);
        return stats!;
      })
    );
    
    return {
      ...classEntity,
      studentCount: students.length,
      subjects: subjectsWithStats,
      teacher
    };
  }

  // Subject management
  async getSubject(id: string): Promise<Subject | null> {
    return this.getDocumentById<Subject>(collections.SUBJECTS, id);
  }

  async getSubjects(): Promise<Subject[]> {
    return this.getAllDocuments<Subject>(collections.SUBJECTS);
  }

  async getSubjectsByTeacherId(teacherId: string): Promise<Subject[]> {
    return this.queryDocuments<Subject>(collections.SUBJECTS, 'teacherId', '==', teacherId);
  }

  async getSubjectsByClassId(classId: string): Promise<Subject[]> {
    return this.queryDocuments<Subject>(collections.SUBJECTS, 'classId', '==', classId);
  }

  async createSubject(subject: SubjectInput): Promise<Subject> {
    const newSubject: Omit<Subject, 'id'> = {
      name: subject.name,
      teacherId: subject.teacherId,
      classId: subject.classId,
      notebookColor: subject.notebookColor || '#4f46e5', // Default to indigo
      submissionFrequency: subject.submissionFrequency || 'weekly'
    };
    
    return this.createDocument<Subject>(collections.SUBJECTS, newSubject);
  }

  async updateSubject(id: string, subjectData: Partial<Subject>): Promise<Subject> {
    return this.updateDocument<Subject>(collections.SUBJECTS, id, subjectData);
  }

  async getSubjectWithStats(id: string, cycleId?: string): Promise<SubjectWithStats | null> {
    const subject = await this.getSubject(id);
    if (!subject) return null;
    
    const students = await this.getStudentsByClassId(subject.classId);
    const stats = await this.getSubjectStats(id, cycleId);
    
    return {
      ...subject,
      ...stats
    };
  }

  private async getSubjectStats(id: string, cycleId?: string): Promise<Omit<SubjectWithStats, keyof Subject>> {
    const subject = await this.getSubject(id);
    if (!subject) {
      throw new Error(`Subject with ID ${id} not found`);
    }
    
    const students = await this.getStudentsByClassId(subject.classId);
    const submissions = await this.getSubmissionsForClassAndSubject(subject.classId, id, cycleId);
    
    const totalStudents = students.length;
    const submittedCount = submissions.filter(s => s.status === 'submitted' || s.status === 'returned').length;
    const missingCount = submissions.filter(s => s.status === 'missing').length;
    const returnedCount = submissions.filter(s => s.status === 'returned').length;
    
    // Calculate submission rate (submitted + returned) / total expected
    const submissionRate = totalStudents > 0 
      ? (submittedCount + returnedCount) / (totalStudents > submissions.length ? totalStudents : submissions.length) 
      : 0;
    
    return {
      submissionRate,
      totalStudents,
      submittedCount,
      missingCount,
      returnedCount
    };
  }

  // Student management
  async getStudent(id: string): Promise<Student | null> {
    return this.getDocumentById<Student>(collections.STUDENTS, id);
  }

  async getStudents(): Promise<Student[]> {
    return this.getAllDocuments<Student>(collections.STUDENTS);
  }

  async getStudentsByClassId(classId: string): Promise<Student[]> {
    return this.queryDocuments<Student>(collections.STUDENTS, 'classId', '==', classId);
  }

  async getStudentByScholarNumber(scholarNumber: string): Promise<Student | null> {
    const students = await this.queryDocuments<Student>(
      collections.STUDENTS, 
      'scholarNumber', 
      '==', 
      scholarNumber
    );
    return students.length > 0 ? students[0] : null;
  }

  async createStudent(studentData: StudentInput): Promise<Student> {
    const avatarInitials = this.getInitials(studentData.fullName);
    
    const newStudent: Omit<Student, 'id'> = {
      fullName: studentData.fullName,
      scholarNumber: studentData.scholarNumber,
      rollNumber: studentData.rollNumber,
      classId: studentData.classId,
      parentName: studentData.parentName,
      parentPhone: studentData.parentPhone,
      parentEmail: studentData.parentEmail,
      avatarInitials,
      photoUrl: studentData.photoUrl,
      isActive: studentData.isActive ?? true,
      joinedAt: Timestamp.now()
    };
    
    return this.createDocument<Student>(collections.STUDENTS, newStudent);
  }

  async updateStudent(id: string, studentData: Partial<Student>): Promise<Student> {
    // Generate new initials if fullName was updated
    if (studentData.fullName) {
      studentData.avatarInitials = this.getInitials(studentData.fullName);
    }
    
    return this.updateDocument<Student>(collections.STUDENTS, id, studentData);
  }

  async changeStudentClass(
    studentId: string, 
    newClassId: string, 
    reason?: string, 
    changedBy?: string
  ): Promise<Student> {
    const student = await this.getStudent(studentId);
    if (!student) {
      throw new Error(`Student with ID ${studentId} not found`);
    }
    
    const oldClassId = student.classId;
    
    // Create a history record
    const historyEntry: Omit<StudentClassHistory, 'id'> = {
      studentId,
      oldClassId,
      newClassId,
      changedAt: Timestamp.now(),
      changedBy: changedBy || 'system',
      reason
    };
    
    await this.createDocument<StudentClassHistory>(
      collections.STUDENT_CLASS_HISTORY, 
      historyEntry
    );
    
    // Update the student record
    return this.updateStudent(studentId, { classId: newClassId });
  }

  async getStudentClassHistory(studentId: string): Promise<StudentClassHistory[]> {
    return this.queryDocuments<StudentClassHistory>(
      collections.STUDENT_CLASS_HISTORY, 
      'studentId', 
      '==', 
      studentId
    );
  }

  // Submission cycle management
  async getSubmissionCycle(id: string): Promise<SubmissionCycle | null> {
    return this.getDocumentById<SubmissionCycle>(collections.SUBMISSION_CYCLES, id);
  }

  async getActiveSubmissionCycle(subjectId: string, classId: string): Promise<SubmissionCycle | null> {
    // In Firestore, we can only filter on one field with inequality operators
    // So we'll use equality filters on both fields
    const cycles = await db.collection(collections.SUBMISSION_CYCLES)
      .where('subjectId', '==', subjectId)
      .where('classId', '==', classId)
      .get();
    
    if (cycles.empty) return null;
    
    // Then filter for active status in the application code
    const activeCycles = cycles.docs
      .filter(doc => doc.data().status === 'active')
      .map(doc => ({
        id: doc.id,
      ...doc.data()
    } as SubmissionCycle));
    
    return activeCycles.length > 0 ? activeCycles[0] : null;
  }

  async getSubmissionCyclesBySubject(subjectId: string): Promise<SubmissionCycle[]> {
    return this.queryDocuments<SubmissionCycle>(
      collections.SUBMISSION_CYCLES, 
      'subjectId', 
      '==', 
      subjectId
    );
  }

  async createSubmissionCycle(cycleData: SubmissionCycleInput): Promise<SubmissionCycle> {
    // Check if there's already an active cycle for this subject and class
    const activeCycle = await this.getActiveSubmissionCycle(
      cycleData.subjectId, 
      cycleData.classId
    );
    
    if (activeCycle) {
      throw new Error(
        `There is already an active submission cycle for this subject and class. ` +
        `Please complete the current cycle before starting a new one.`
      );
    }
    
    const newCycle: Omit<SubmissionCycle, 'id'> = {
      subjectId: cycleData.subjectId,
      classId: cycleData.classId,
      startDate: Timestamp.fromDate(cycleData.startDate),
      endDate: cycleData.endDate ? Timestamp.fromDate(cycleData.endDate) : undefined,
      name: cycleData.name,
      status: 'active',
      createdBy: cycleData.createdBy || 'system',
      createdAt: Timestamp.now()
    };
    
    return this.createDocument<SubmissionCycle>(collections.SUBMISSION_CYCLES, newCycle);
  }

  async completeSubmissionCycle(id: string): Promise<SubmissionCycle> {
    const cycle = await this.getSubmissionCycle(id);
    if (!cycle) {
      throw new Error(`Submission cycle with ID ${id} not found`);
    }
    
    const updates: Partial<SubmissionCycle> = {
      status: 'completed',
      endDate: Timestamp.now()
    };
    
    return this.updateDocument<SubmissionCycle>(collections.SUBMISSION_CYCLES, id, updates);
  }

  // Submission management
  async getSubmission(id: string): Promise<Submission | null> {
    return this.getDocumentById<Submission>(collections.SUBMISSIONS, id);
  }

  async getSubmissionsByDate(date: Date): Promise<Submission[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const submissions = await db.collection(collections.SUBMISSIONS)
      .where('date', '>=', Timestamp.fromDate(startOfDay))
      .where('date', '<=', Timestamp.fromDate(endOfDay))
      .get();
    
    return submissions.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Submission));
  }

  async getSubmissionsByCycle(cycleId: string): Promise<Submission[]> {
    return this.queryDocuments<Submission>(collections.SUBMISSIONS, 'cycleId', '==', cycleId);
  }

  async getSubmissionsForStudent(studentId: string): Promise<Submission[]> {
    return this.queryDocuments<Submission>(collections.SUBMISSIONS, 'studentId', '==', studentId);
  }

  async getSubmissionsForStudentAndSubject(studentId: string, subjectId: string): Promise<Submission[]> {
    const submissions = await db.collection(collections.SUBMISSIONS)
      .where('studentId', '==', studentId)
      .where('subjectId', '==', subjectId)
      .get();
    
    return submissions.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Submission));
  }

  async getSubmissionsForClassAndSubject(
    classId: string, 
    subjectId: string, 
    cycleId?: string
  ): Promise<Submission[]> {
    let query = db.collection(collections.SUBMISSIONS).where('subjectId', '==', subjectId);
    
    if (cycleId) {
      query = query.where('cycleId', '==', cycleId);
    } else {
      // If no cycle is specified, get the active cycle
      const activeCycle = await this.getActiveSubmissionCycle(subjectId, classId);
      if (activeCycle) {
        query = query.where('cycleId', '==', activeCycle.id);
      }
    }
    
    const submissions = await query.get();
    
    // Filter by classId by checking each student
    const submissionsData = submissions.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Submission));
    
    // We need to filter by class ID by getting all students in the class
    // and then filtering submissions by student ID
    const students = await this.getStudentsByClassId(classId);
    const studentIds = students.map(student => student.id);
    
    return submissionsData.filter(submission => 
      studentIds.includes(submission.studentId)
    );
  }

  async getSubmissionsWithStatus(
    status: string, 
    classId?: string, 
    subjectId?: string,
    cycleId?: string
  ): Promise<Submission[]> {
    let query = db.collection(collections.SUBMISSIONS).where('status', '==', status);
    
    if (subjectId) {
      query = query.where('subjectId', '==', subjectId);
    }
    
    if (cycleId) {
      query = query.where('cycleId', '==', cycleId);
    }
    
    const submissions = await query.get();
    const submissionsData = submissions.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Submission));
    
    if (classId) {
      // Filter by classId by checking each student
      const students = await this.getStudentsByClassId(classId);
      const studentIds = students.map(student => student.id);
      
      return submissionsData.filter(submission => 
        studentIds.includes(submission.studentId)
      );
    }
    
    return submissionsData;
  }

  async createSubmission(submission: SubmissionInput): Promise<Submission> {
    // Check if a submission already exists for this student, subject, and cycle
    const existingSubmissions = await db.collection(collections.SUBMISSIONS)
      .where('studentId', '==', submission.studentId)
      .where('subjectId', '==', submission.subjectId)
      .where('cycleId', '==', submission.cycleId)
      .get();
    
    if (!existingSubmissions.empty) {
      // Update the existing submission instead of creating a new one
      const existingSubmission = existingSubmissions.docs[0];
      
      const updates: Partial<Submission> = {
        status: submission.status,
        notes: submission.notes,
        followUpRequired: submission.followUpRequired || false
      };
      
      if (submission.status === 'submitted') {
        updates.submittedAt = Timestamp.now();
      } else if (submission.status === 'returned') {
        updates.returnedAt = Timestamp.now();
      }
      
      return this.updateDocument<Submission>(
        collections.SUBMISSIONS, 
        existingSubmission.id, 
        updates
      );
    }
    
    // Get the student to check previous submission history
    const student = await this.getStudent(submission.studentId);
    if (!student) {
      throw new Error(`Student with ID ${submission.studentId} not found`);
    }
    
    // Get the subject
    const subject = await this.getSubject(submission.subjectId);
    if (!subject) {
      throw new Error(`Subject with ID ${submission.subjectId} not found`);
    }
    
    // Get previous submissions for this student and subject to track consecutive misses
    const previousSubmissions = await this.getSubmissionsForStudentAndSubject(
      submission.studentId, 
      submission.subjectId
    );
    
    // Calculate consecutive misses
    let consecutiveMisses = 0;
    if (submission.status === 'missing') {
      // Find the last submission
      const sortedSubmissions = previousSubmissions.sort((a, b) => 
        b.date.toMillis() - a.date.toMillis()
      );
      
      // Count consecutive misses
      for (const prevSubmission of sortedSubmissions) {
        if (prevSubmission.status === 'missing') {
          consecutiveMisses++;
        } else {
          break;
        }
      }
      
      // Add 1 for the current missing submission
      consecutiveMisses += 1;
    }
    
    const newSubmission: Omit<Submission, 'id'> = {
      studentId: submission.studentId,
      subjectId: submission.subjectId,
      cycleId: submission.cycleId,
      date: Timestamp.now(),
      status: submission.status,
      submittedAt: submission.status === 'submitted' ? Timestamp.now() : undefined,
      returnedAt: submission.status === 'returned' ? Timestamp.now() : undefined,
      notificationSent: false,
      notes: submission.notes,
      followUpRequired: submission.followUpRequired || false,
      consecutiveMisses
    };
    
    return this.createDocument<Submission>(collections.SUBMISSIONS, newSubmission);
  }

  async updateSubmission(id: string, submissionUpdate: Partial<Submission>): Promise<Submission> {
    const submission = await this.getSubmission(id);
    if (!submission) {
      throw new Error(`Submission with ID ${id} not found`);
    }
    
    // Update timestamps based on status changes
    if (submissionUpdate.status === 'submitted' && submission.status !== 'submitted') {
      submissionUpdate.submittedAt = Timestamp.now();
    } else if (submissionUpdate.status === 'returned' && submission.status !== 'returned') {
      submissionUpdate.returnedAt = Timestamp.now();
    }
    
    return this.updateDocument<Submission>(collections.SUBMISSIONS, id, submissionUpdate);
  }

  async markSubmissionAsReturned(id: string): Promise<Submission> {
    const submission = await this.getSubmission(id);
    if (!submission) {
      throw new Error(`Submission with ID ${id} not found`);
    }
    
    if (submission.status !== 'submitted') {
      throw new Error(`Cannot mark a submission as returned if it's not in 'submitted' status`);
    }
    
    const updates: Partial<Submission> = {
      status: 'returned',
      returnedAt: Timestamp.now()
    };
    
    return this.updateDocument<Submission>(collections.SUBMISSIONS, id, updates);
  }

  async markAllSubmissionsAsReturned(cycleId: string): Promise<number> {
    const submissions = await this.getSubmissionsByCycle(cycleId);
    const submittedSubmissions = submissions.filter(s => s.status === 'submitted');
    
    const batch = db.batch();
    
    submittedSubmissions.forEach(submission => {
      const docRef = db.collection(collections.SUBMISSIONS).doc(submission.id);
      batch.update(docRef, {
        status: 'returned',
        returnedAt: FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    
    return submittedSubmissions.length;
  }

  async getStudentsWithSubmissions(
    classId: string, 
    subjectId: string, 
    cycleId?: string
  ): Promise<StudentWithSubmission[]> {
    const students = await this.getStudentsByClassId(classId);
    
    // Get the subject to verify it exists
    const subject = await this.getSubject(subjectId);
    if (!subject) {
      throw new Error(`Subject with ID ${subjectId} not found`);
    }
    
    let activeCycle: SubmissionCycle | null = null;
    if (cycleId) {
      activeCycle = await this.getSubmissionCycle(cycleId);
    } else {
      activeCycle = await this.getActiveSubmissionCycle(subjectId, classId);
    }
    
    // Get all submissions for this subject and class
    const allSubmissions = await this.getSubmissionsForClassAndSubject(
      classId, 
      subjectId,
      activeCycle?.id
    );
    
    return Promise.all(students.map(async student => {
      // Get all submissions for this student and subject
      const studentSubmissions = allSubmissions.filter(s => s.studentId === student.id);
      
      // Get submissions for current cycle if it exists
      const currentCycleSubmissions = activeCycle 
        ? studentSubmissions.filter(s => s.cycleId === activeCycle.id)
        : [];
      
      // Get the latest submission
      const sortedSubmissions = studentSubmissions.sort((a, b) => 
        b.date.toMillis() - a.date.toMillis()
      );
      
      const latestSubmission = sortedSubmissions.length > 0 
        ? sortedSubmissions[0] 
        : undefined;
      
      // Calculate submission stats
      const submittedCount = studentSubmissions.filter(
        s => s.status === 'submitted' || s.status === 'returned'
      ).length;
      
      const missedCount = studentSubmissions.filter(s => s.status === 'missing').length;
      const returnedCount = studentSubmissions.filter(s => s.status === 'returned').length;
      
      // Get consecutive misses
      const consecutiveMisses = latestSubmission?.consecutiveMisses || 0;
      
      // Predict if student is a defaulter (3+ consecutive misses)
      const predictedDefaulter = consecutiveMisses >= 3;
      
      return {
        ...student,
        submissions: studentSubmissions,
        latestSubmission,
        submittedCount,
        missedCount,
        returnedCount,
        consecutiveMisses,
        predictedDefaulter
      };
    }));
  }

  // Analytics
  async getSubmissionAnalytics(
    classId: string, 
    subjectId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<any> {
    const submissions = await db.collection(collections.SUBMISSIONS)
      .where('subjectId', '==', subjectId)
      .where('date', '>=', Timestamp.fromDate(startDate))
      .where('date', '<=', Timestamp.fromDate(endDate))
      .get();
    
    const submissionsData = submissions.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Submission));
    
    // Filter by classId by checking each student
    const students = await this.getStudentsByClassId(classId);
    const studentIds = students.map(student => student.id);
    
    const classSubmissions = submissionsData.filter(submission => 
      studentIds.includes(submission.studentId)
    );
    
    // Analyze submission trends
    const totalSubmissions = classSubmissions.length;
    const submittedCount = classSubmissions.filter(s => 
      s.status === 'submitted' || s.status === 'returned'
    ).length;
    
    const missingCount = classSubmissions.filter(s => s.status === 'missing').length;
    const returnedCount = classSubmissions.filter(s => s.status === 'returned').length;
    
    // Group by week
    const weeklyData: { [key: string]: { submitted: number; missing: number; returned: number } } = {};
    
    classSubmissions.forEach(submission => {
      const submissionDate = submission.date.toDate();
      const weekStart = new Date(submissionDate);
      weekStart.setDate(submissionDate.getDate() - submissionDate.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { submitted: 0, missing: 0, returned: 0 };
      }
      
      if (submission.status === 'submitted') {
        weeklyData[weekKey].submitted++;
      } else if (submission.status === 'missing') {
        weeklyData[weekKey].missing++;
      } else if (submission.status === 'returned') {
        weeklyData[weekKey].returned++;
      }
    });
    
    return {
      overview: {
        totalSubmissions,
        submittedCount,
        missingCount,
        returnedCount,
        submissionRate: totalSubmissions > 0 ? (submittedCount / totalSubmissions) * 100 : 0
      },
      weekly: Object.entries(weeklyData).map(([week, data]) => ({
        week,
        ...data
      })),
      submissions: classSubmissions
    };
  }

  async getPotentialDefaulters(
    classId: string, 
    threshold: number = 2
  ): Promise<StudentWithSubmission[]> {
    const students = await this.getStudentsByClassId(classId);
    const subjects = await this.getSubjectsByClassId(classId);
    
    // Get all students with their submissions for each subject
    const studentsWithSubmissions = await Promise.all(
      students.map(async student => {
        const subjectResults = await Promise.all(
          subjects.map(async subject => {
            const submissions = await this.getSubmissionsForStudentAndSubject(
              student.id, 
              subject.id
            );
            
            // Sort by date descending
            const sortedSubmissions = submissions.sort((a, b) => 
              b.date.toMillis() - a.date.toMillis()
            );
            
            const consecutiveMisses = sortedSubmissions.length > 0 
              ? sortedSubmissions[0].consecutiveMisses 
              : 0;
            
            return {
              subjectId: subject.id,
              subjectName: subject.name,
              submissions,
              latestSubmission: sortedSubmissions.length > 0 ? sortedSubmissions[0] : undefined,
              consecutiveMisses
            };
          })
        );
        
        // Count subjects where student has missed more than threshold submissions in a row
        const defaultingSubjects = subjectResults.filter(
          subject => subject.consecutiveMisses >= threshold
        );
        
        // Get all submissions across subjects
        const allSubmissions = subjectResults.flatMap(subject => subject.submissions);
        
        // Calculate aggregated stats
        const submittedCount = allSubmissions.filter(
          s => s.status === 'submitted' || s.status === 'returned'
        ).length;
        
        const missedCount = allSubmissions.filter(s => s.status === 'missing').length;
        const returnedCount = allSubmissions.filter(s => s.status === 'returned').length;
        
        return {
          ...student,
          submissions: allSubmissions,
          latestSubmission: allSubmissions.length > 0 
            ? allSubmissions.sort((a, b) => b.date.toMillis() - a.date.toMillis())[0] 
            : undefined,
          submittedCount,
          missedCount,
          returnedCount,
          defaultingSubjects,
          predictedDefaulter: defaultingSubjects.length > 0
        };
      })
    );
    
    // Filter to only potential defaulters
    return studentsWithSubmissions.filter(student => student.predictedDefaulter);
  }

  // Notification management
  async getNotificationTemplate(id: string): Promise<NotificationTemplate | null> {
    return this.getDocumentById<NotificationTemplate>(collections.NOTIFICATION_TEMPLATES, id);
  }

  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    return this.getAllDocuments<NotificationTemplate>(collections.NOTIFICATION_TEMPLATES);
  }

  async getNotificationTemplateByType(type: string): Promise<NotificationTemplate | null> {
    const templates = await this.queryDocuments<NotificationTemplate>(
      collections.NOTIFICATION_TEMPLATES,
      'type',
      '==',
      type
    );
    
    // Get the default template for this type
    const defaultTemplate = templates.find(t => t.isDefault);
    
    return defaultTemplate || (templates.length > 0 ? templates[0] : null);
  }

  async createNotificationTemplate(template: NotificationTemplateInput): Promise<NotificationTemplate> {
    // If this is set as default, unset any other default templates of the same type
    if (template.isDefault) {
      const existingTemplates = await this.queryDocuments<NotificationTemplate>(
        collections.NOTIFICATION_TEMPLATES,
        'type',
        '==',
        template.type
      );
      
      const batch = db.batch();
      existingTemplates.forEach(existing => {
        if (existing.isDefault) {
          const docRef = db.collection(collections.NOTIFICATION_TEMPLATES).doc(existing.id);
          batch.update(docRef, { isDefault: false });
        }
      });
      
      await batch.commit();
    }
    
    const newTemplate: Omit<NotificationTemplate, 'id'> = {
      name: template.name,
      content: template.content,
      type: template.type,
      createdBy: template.createdBy || 'system',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isDefault: template.isDefault || false
    };
    
    return this.createDocument<NotificationTemplate>(collections.NOTIFICATION_TEMPLATES, newTemplate);
  }

  async updateNotificationTemplate(
    id: string, 
    templateData: Partial<NotificationTemplate>
  ): Promise<NotificationTemplate> {
    const template = await this.getNotificationTemplate(id);
    if (!template) {
      throw new Error(`Notification template with ID ${id} not found`);
    }
    
    // If this is being set as default, unset any other default templates of the same type
    if (templateData.isDefault) {
      const existingTemplates = await this.queryDocuments<NotificationTemplate>(
        collections.NOTIFICATION_TEMPLATES,
        'type',
        '==',
        template.type
      );
      
      const batch = db.batch();
      existingTemplates.forEach(existing => {
        if (existing.isDefault && existing.id !== id) {
          const docRef = db.collection(collections.NOTIFICATION_TEMPLATES).doc(existing.id);
          batch.update(docRef, { isDefault: false });
        }
      });
      
      await batch.commit();
    }
    
    // Always update the updatedAt timestamp
    templateData.updatedAt = Timestamp.now();
    
    return this.updateDocument<NotificationTemplate>(
      collections.NOTIFICATION_TEMPLATES, 
      id, 
      templateData
    );
  }

  async getNotificationHistory(id: string): Promise<NotificationHistory | null> {
    return this.getDocumentById<NotificationHistory>(collections.NOTIFICATION_HISTORY, id);
  }

  async getNotificationHistoryByStudent(studentId: string): Promise<NotificationHistory[]> {
    return this.queryDocuments<NotificationHistory>(
      collections.NOTIFICATION_HISTORY,
      'studentId',
      '==',
      studentId
    );
  }

  async createNotificationHistory(
    notification: Partial<NotificationHistory>
  ): Promise<NotificationHistory> {
    const newNotification: Omit<NotificationHistory, 'id'> = {
      studentId: notification.studentId!,
      submissionId: notification.submissionId!,
      sent: notification.sent || false,
      sentAt: notification.sentAt || Timestamp.now(),
      messageType: notification.messageType || 'sms',
      messageContent: notification.messageContent!,
      recipientNumber: notification.recipientNumber,
      recipientEmail: notification.recipientEmail,
      status: notification.status || 'pending',
      errorMessage: notification.errorMessage
    };
    
    const history = await this.createDocument<NotificationHistory>(
      collections.NOTIFICATION_HISTORY, 
      newNotification
    );
    
    // If notification is for a specific submission, update the submission record
    if (notification.submissionId) {
      await this.updateDocument<Submission>(
        collections.SUBMISSIONS,
        notification.submissionId,
        {
          notificationSent: true,
          notificationSentAt: Timestamp.now()
        }
      );
    }
    
    return history;
  }
  
  /**
   * Gets students in a class with their submission history across all subjects
   * This includes previous submissions and not just active cycles
   */
  async getStudentsWithHistory(
    classId: string
  ): Promise<Array<Student & { 
    submissions: Submission[]; 
    previousMissingCount: number;
  }>> {
    try {
      // Get all students in this class
      const students = await this.getStudentsByClassId(classId);
      if (!students.length) return [];

      // Get all subjects for this class
      const subjects = await this.getSubjectsByClassId(classId);
      if (!subjects.length) return [];

      const result = [];

      for (const student of students) {
        // Get all submission history for this student across all subjects
        const allSubmissions: Submission[] = [];
        let previousMissingCount = 0;
        
        for (const subject of subjects) {
          // Get all submissions for this student and subject
          const studentSubmissions = await this.getSubmissionsForStudentAndSubject(student.id, subject.id);
          
          // Count previous missing submissions (in completed cycles)
          const cycles = await this.getSubmissionCyclesBySubject(subject.id);
          const completedCycles = cycles.filter(cycle => cycle.status === 'completed');
          
          for (const cycle of completedCycles) {
            const hasSubmissionForCycle = studentSubmissions.some(s => s.cycleId === cycle.id);
            
            if (!hasSubmissionForCycle) {
              previousMissingCount++;
              
              // Create a "missing" submission record for history
              allSubmissions.push({
                id: `missing-${student.id}-${subject.id}-${cycle.id}`,
                studentId: student.id,
                subjectId: subject.id,
                subjectName: subject.name,
                classId: classId,
                cycleId: cycle.id,
                cycleName: cycle.name,
                status: 'missing',
                notificationSent: false,
                cycleStartDate: cycle.startDate,
                date: cycle.startDate, // Required field
                followUpRequired: false, // Required field
                consecutiveMisses: 0 // Required field
              } as Submission);
            }
          }
          
          // Add existing submissions
          allSubmissions.push(...studentSubmissions);
          
          // Check current active cycle
          const activeCycle = await this.getActiveSubmissionCycle(subject.id, classId);
          if (activeCycle) {
            const hasSubmittedForActiveCycle = studentSubmissions.some(s => s.cycleId === activeCycle.id);
            
            if (!hasSubmittedForActiveCycle) {
              // Create a "missing" submission record for active cycle
              allSubmissions.push({
                id: `missing-active-${student.id}-${subject.id}-${activeCycle.id}`,
                studentId: student.id,
                subjectId: subject.id,
                subjectName: subject.name,
                classId: classId,
                cycleId: activeCycle.id,
                cycleName: activeCycle.name,
                status: 'missing',
                notificationSent: false,
                cycleStartDate: activeCycle.startDate,
                date: activeCycle.startDate, // Required field
                followUpRequired: false, // Required field
                consecutiveMisses: 0 // Required field
              } as Submission);
            }
          }
        }
        
        result.push({
          ...student,
          submissions: allSubmissions,
          previousMissingCount
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting students with history:', error);
      throw error;
    }
  }
}

export const storage = new FirebaseStorage();
export default storage;