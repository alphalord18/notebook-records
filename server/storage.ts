import { users, User, InsertUser, classes, Class, InsertClass, subjects, Subject, InsertSubject, students, Student, InsertStudent, submissions, Submission, InsertSubmission, SubmissionWithDetails, StudentWithSubmission } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Class operations
  getClass(id: number): Promise<Class | undefined>;
  getClasses(): Promise<Class[]>;
  getClassesByTeacherId(teacherId: number): Promise<Class[]>;
  createClass(classData: InsertClass): Promise<Class>;
  
  // Subject operations
  getSubject(id: number): Promise<Subject | undefined>;
  getSubjects(): Promise<Subject[]>;
  getSubjectsByTeacherId(teacherId: number): Promise<Subject[]>;
  getSubjectsByClassId(classId: number): Promise<Subject[]>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  
  // Student operations
  getStudent(id: number): Promise<Student | undefined>;
  getStudents(): Promise<Student[]>;
  getStudentsByClassId(classId: number): Promise<Student[]>;
  createStudent(student: InsertStudent): Promise<Student>;
  
  // Submission operations
  getSubmission(id: number): Promise<Submission | undefined>;
  getSubmissionsByDate(date: Date): Promise<Submission[]>;
  getSubmissionsForStudentAndSubject(studentId: number, subjectId: number): Promise<Submission[]>;
  getSubmissionsForClassAndSubject(classId: number, subjectId: number, date?: Date): Promise<SubmissionWithDetails[]>;
  getSubmissionsWithStatus(status: string, classId?: number, subjectId?: number): Promise<Submission[]>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmission(id: number, submission: Partial<Submission>): Promise<Submission>;
  markSubmissionAsReturned(id: number): Promise<Submission>;
  markAllSubmissionsAsReturned(classId: number, subjectId: number, date?: Date): Promise<number>;
  getStudentsWithSubmissions(classId: number, subjectId: number, date?: Date): Promise<StudentWithSubmission[]>;
  getSubmissionAnalytics(classId: number, subjectId: number, startDate: Date, endDate: Date): Promise<any>;
  
  // Authentication
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private classes: Map<number, Class>;
  private subjects: Map<number, Subject>;
  private students: Map<number, Student>;
  private submissions: Map<number, Submission>;
  sessionStore: session.SessionStore;
  
  private userIdCounter = 1;
  private classIdCounter = 1;
  private subjectIdCounter = 1;
  private studentIdCounter = 1;
  private submissionIdCounter = 1;

  constructor() {
    this.users = new Map();
    this.classes = new Map();
    this.subjects = new Map();
    this.students = new Map();
    this.submissions = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });

    // Add an admin user by default
    this.createUser({
      username: "admin",
      password: "password",
      fullName: "Admin User",
      role: "admin",
      avatarInitials: "AU",
    });

    // Add a teacher
    this.createUser({
      username: "teacher",
      password: "password",
      fullName: "Tanya Singh",
      role: "teacher",
      avatarInitials: "TS",
    }).then(teacher => {
      // Create a class for the teacher
      this.createClass({
        name: "7B",
        teacherId: teacher.id,
      }).then(createdClass => {
        // Create a subject for the class
        this.createSubject({
          name: "Science",
          teacherId: teacher.id,
          classId: createdClass.id,
        }).then(subject => {
          // Create some sample students
          const studentData = [
            { fullName: "Aditya Raj", rollNumber: "7B-01", parentName: "Rajesh Raj", avatarInitials: "AR" },
            { fullName: "Priya Singh", rollNumber: "7B-02", parentName: "Anil Singh", avatarInitials: "PS" },
            { fullName: "Rahul Kumar", rollNumber: "7B-03", parentName: "Manoj Kumar", avatarInitials: "RK" },
            { fullName: "Neha Patel", rollNumber: "7B-04", parentName: "Deepak Patel", avatarInitials: "NP" },
            { fullName: "Sandeep Tiwari", rollNumber: "7B-05", parentName: "Rakesh Tiwari", avatarInitials: "ST" },
          ];

          const promises = studentData.map(data => 
            this.createStudent({
              ...data,
              classId: createdClass.id,
              parentPhone: "",
            })
          );

          Promise.all(promises).then(students => {
            // Create sample submissions
            const today = new Date();
            
            students.forEach((student, index) => {
              const submissionStatus = index < 2 ? "submitted" : (index === 3 ? "returned" : "missing");
              const submittedAt = submissionStatus !== "missing" ? new Date(today.getTime() - Math.floor(Math.random() * 3600000)) : undefined;
              const returnedAt = submissionStatus === "returned" ? new Date(today.getTime() - Math.floor(Math.random() * 1800000)) : undefined;
              
              this.createSubmission({
                studentId: student.id,
                subjectId: subject.id,
                date: today,
                status: submissionStatus,
                submittedAt,
                returnedAt,
                notificationSent: false,
              });
            });
          });
        });
      });
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getClass(id: number): Promise<Class | undefined> {
    return this.classes.get(id);
  }

  async getClasses(): Promise<Class[]> {
    return Array.from(this.classes.values());
  }

  async getClassesByTeacherId(teacherId: number): Promise<Class[]> {
    return Array.from(this.classes.values()).filter(
      (cls) => cls.teacherId === teacherId
    );
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const id = this.classIdCounter++;
    const newClass: Class = { ...classData, id };
    this.classes.set(id, newClass);
    return newClass;
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    return this.subjects.get(id);
  }

  async getSubjects(): Promise<Subject[]> {
    return Array.from(this.subjects.values());
  }

  async getSubjectsByTeacherId(teacherId: number): Promise<Subject[]> {
    return Array.from(this.subjects.values()).filter(
      (subject) => subject.teacherId === teacherId
    );
  }

  async getSubjectsByClassId(classId: number): Promise<Subject[]> {
    return Array.from(this.subjects.values()).filter(
      (subject) => subject.classId === classId
    );
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const id = this.subjectIdCounter++;
    const newSubject: Subject = { ...subject, id };
    this.subjects.set(id, newSubject);
    return newSubject;
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values());
  }

  async getStudentsByClassId(classId: number): Promise<Student[]> {
    return Array.from(this.students.values()).filter(
      (student) => student.classId === classId
    );
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const id = this.studentIdCounter++;
    const newStudent: Student = { ...student, id };
    this.students.set(id, newStudent);
    return newStudent;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    return this.submissions.get(id);
  }

  async getSubmissionsByDate(date: Date): Promise<Submission[]> {
    const dateStr = date.toDateString();
    return Array.from(this.submissions.values()).filter(
      (submission) => submission.date.toDateString() === dateStr
    );
  }

  async getSubmissionsForStudentAndSubject(studentId: number, subjectId: number): Promise<Submission[]> {
    return Array.from(this.submissions.values()).filter(
      (submission) => submission.studentId === studentId && submission.subjectId === subjectId
    );
  }

  async getSubmissionsForClassAndSubject(classId: number, subjectId: number, date?: Date): Promise<SubmissionWithDetails[]> {
    const students = await this.getStudentsByClassId(classId);
    const studentIds = students.map(student => student.id);
    
    let submissions = Array.from(this.submissions.values()).filter(
      (submission) => 
        studentIds.includes(submission.studentId) && 
        submission.subjectId === subjectId
    );
    
    if (date) {
      const dateStr = date.toDateString();
      submissions = submissions.filter(
        (submission) => submission.date.toDateString() === dateStr
      );
    }
    
    // Enrich with student and subject details
    return submissions.map(submission => {
      const student = this.students.get(submission.studentId)!;
      const subject = this.subjects.get(submission.subjectId)!;
      return { ...submission, student, subject };
    });
  }

  async getSubmissionsWithStatus(status: string, classId?: number, subjectId?: number): Promise<Submission[]> {
    let filteredSubmissions = Array.from(this.submissions.values()).filter(
      (submission) => submission.status === status
    );
    
    if (subjectId) {
      filteredSubmissions = filteredSubmissions.filter(
        (submission) => submission.subjectId === subjectId
      );
    }
    
    if (classId) {
      const students = await this.getStudentsByClassId(classId);
      const studentIds = students.map(student => student.id);
      filteredSubmissions = filteredSubmissions.filter(
        (submission) => studentIds.includes(submission.studentId)
      );
    }
    
    return filteredSubmissions;
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const id = this.submissionIdCounter++;
    const newSubmission: Submission = { ...submission, id };
    this.submissions.set(id, newSubmission);
    return newSubmission;
  }

  async updateSubmission(id: number, submissionUpdate: Partial<Submission>): Promise<Submission> {
    const submission = this.submissions.get(id);
    if (!submission) {
      throw new Error(`Submission with id ${id} not found`);
    }
    
    const updatedSubmission = { ...submission, ...submissionUpdate };
    this.submissions.set(id, updatedSubmission);
    return updatedSubmission;
  }

  async markSubmissionAsReturned(id: number): Promise<Submission> {
    const submission = this.submissions.get(id);
    if (!submission) {
      throw new Error(`Submission with id ${id} not found`);
    }
    
    const updatedSubmission = { 
      ...submission, 
      status: "returned", 
      returnedAt: new Date()
    };
    
    this.submissions.set(id, updatedSubmission);
    return updatedSubmission;
  }

  async markAllSubmissionsAsReturned(classId: number, subjectId: number, date?: Date): Promise<number> {
    const submissionsToMark = await this.getSubmissionsForClassAndSubject(classId, subjectId, date);
    const filteredSubmissions = submissionsToMark.filter(sub => sub.status === "submitted");
    
    for (const submission of filteredSubmissions) {
      submission.status = "returned";
      submission.returnedAt = new Date();
      this.submissions.set(submission.id, submission);
    }
    
    return filteredSubmissions.length;
  }

  async getStudentsWithSubmissions(classId: number, subjectId: number, date?: Date): Promise<StudentWithSubmission[]> {
    const students = await this.getStudentsByClassId(classId);
    const today = date || new Date();
    const todayStr = today.toDateString();
    
    return await Promise.all(
      students.map(async (student) => {
        let submissions = await this.getSubmissionsForStudentAndSubject(student.id, subjectId);
        
        if (date) {
          submissions = submissions.filter(
            (submission) => submission.date.toDateString() === todayStr
          );
        }
        
        // If no submission exists for today, create a "missing" submission
        if (submissions.length === 0) {
          const newSubmission: InsertSubmission = {
            studentId: student.id,
            subjectId,
            date: today,
            status: "missing",
            submittedAt: undefined,
            returnedAt: undefined,
            notificationSent: false,
          };
          const submission = await this.createSubmission(newSubmission);
          submissions = [submission];
        }
        
        return {
          ...student,
          submissions
        };
      })
    );
  }

  async getSubmissionAnalytics(classId: number, subjectId: number, startDate: Date, endDate: Date): Promise<any> {
    const students = await this.getStudentsByClassId(classId);
    const submissions = Array.from(this.submissions.values()).filter(
      (submission) => 
        submission.subjectId === subjectId &&
        submission.date >= startDate &&
        submission.date <= endDate
    );
    
    // Count by status
    const byStatus = {
      submitted: submissions.filter(s => s.status === "submitted").length,
      returned: submissions.filter(s => s.status === "returned").length,
      missing: submissions.filter(s => s.status === "missing").length,
    };
    
    // Calculate compliance rate
    const total = submissions.length;
    const complianceRate = total > 0 ? 
      ((byStatus.submitted + byStatus.returned) / total) * 100 : 0;
    
    // Get frequent defaulters (students who missed submissions)
    const defaulterCounts: Record<number, number> = {};
    
    submissions.filter(s => s.status === "missing").forEach(s => {
      defaulterCounts[s.studentId] = (defaulterCounts[s.studentId] || 0) + 1;
    });
    
    const frequentDefaulters = Object.entries(defaulterCounts)
      .map(([studentId, count]) => ({
        student: students.find(s => s.id === parseInt(studentId)),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      byStatus,
      complianceRate,
      frequentDefaulters,
      totalStudents: students.length,
      totalSubmissions: total
    };
  }
}

export const storage = new MemStorage();
