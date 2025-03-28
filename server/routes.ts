import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage"; 
import { z } from "zod";
import { 
  SubmissionInput, 
  DefaulterPrediction, 
  collections 
} from "@shared/schema";
import { notificationService } from "./notification-service";
import { defaulterPredictionService } from "./defaulter-prediction";
import { twilioService } from "./twilio-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };
  
  // Role-based middleware
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user?.role === 'admin') {
      return next();
    }
    res.status(403).json({ message: "Admin access required" });
  };
  
  const isSubjectTeacher = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && 
       (req.user?.role === 'subject_teacher' || req.user?.role === 'admin')) {
      return next();
    }
    res.status(403).json({ message: "Subject teacher access required" });
  };
  
  const isClassTeacher = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && 
       (req.user?.role === 'class_teacher' || req.user?.role === 'admin')) {
      return next();
    }
    res.status(403).json({ message: "Class teacher access required" });
  };
  
  const isClassTeacherForClass = (req: Request, res: Response, next: Function) => {
    const classId = req.params.classId || req.body.classId;
    
    if (req.isAuthenticated() && 
       (req.user?.role === 'admin' || 
       (req.user?.role === 'class_teacher' && req.user?.assignedClassId === classId))) {
      return next();
    }
    res.status(403).json({ message: "You don't have access to this class" });
  };

  // Academic Sessions
  app.get("/api/sessions", isAuthenticated, async (req, res) => {
    try {
      const sessions = await firebaseStorage.getSessions();
      res.json(sessions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch academic sessions" });
    }
  });

  app.get("/api/sessions/active", isAuthenticated, async (req, res) => {
    try {
      const session = await firebaseStorage.getActiveSession();
      if (!session) {
        return res.status(404).json({ message: "No active session found" });
      }
      res.json(session);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  app.post("/api/sessions", isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can create sessions" });
      }
      
      const session = await firebaseStorage.createSession(req.body);
      res.status(201).json(session);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.post("/api/sessions/:id/activate", isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Only admins can activate sessions" });
      }
      
      const session = await firebaseStorage.setActiveSession(req.params.id);
      res.json(session);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to activate session" });
    }
  });

  // Get all classes for the logged-in teacher
  app.get("/api/classes", isAuthenticated, async (req, res) => {
    try {
      let classes;
      if (req.user?.role === "admin") {
        classes = await firebaseStorage.getClasses();
      } else if (req.user?.role === "class_teacher" && req.user?.assignedClassId) {
        // For class teachers, only return their assigned class
        const assignedClass = await firebaseStorage.getClass(req.user.assignedClassId);
        classes = assignedClass ? [assignedClass] : [];
      } else if (req.user?.role === "subject_teacher") {
        // For subject teachers, return the classes they teach
        classes = await firebaseStorage.getClassesByTeacherId(req.user?.id);
      } else {
        classes = [];
      }
      res.json(classes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  // Get a specific class with stats
  app.get("/api/classes/:classId", isAuthenticated, async (req, res) => {
    try {
      // Check if user is authorized for this class
      if (req.user?.role === 'class_teacher' && req.user?.assignedClassId !== req.params.classId) {
        if (req.user?.role !== 'admin') {
          return res.status(403).json({ message: "You don't have access to this class" });
        }
      }
      
      const classWithStats = await firebaseStorage.getClassWithStats(req.params.classId);
      if (!classWithStats) {
        return res.status(404).json({ message: "Class not found" });
      }
      res.json(classWithStats);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });
  
  // Class teacher dashboard - get all students with submission stats for their class
  app.get("/api/class-teacher-dashboard", isAuthenticated, async (req, res) => {
    try {
      // Only class teachers and admins can access this endpoint
      if (req.user?.role !== 'class_teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get the assigned class ID
      const classId = req.user?.role === 'class_teacher' 
        ? req.user?.assignedClassId 
        : req.query.classId as string;
      
      if (!classId) {
        return res.status(400).json({ message: "Class ID is required" });
      }
      
      // Get class details with stats
      const classWithStats = await firebaseStorage.getClassWithStats(classId);
      if (!classWithStats) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      // Get students in the class
      const students = await firebaseStorage.getStudentsByClassId(classId);
      
      // Get potential defaulters
      const potentialDefaulters = await firebaseStorage.getPotentialDefaulters(classId);
      
      // Get subjects for this class
      const subjects = await firebaseStorage.getSubjectsByClassId(classId);
      
      res.json({
        class: classWithStats,
        students,
        subjects,
        potentialDefaulters
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch class teacher dashboard data" });
    }
  });

  // Create a new class
  app.post("/api/classes", isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.body.teacherId !== req.user.id) {
        return res.status(403).json({ message: "You can only create classes assigned to yourself" });
      }
      
      const newClass = await firebaseStorage.createClass(req.body);
      res.status(201).json(newClass);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  // Get all subjects for a class
  app.get("/api/classes/:classId/subjects", isAuthenticated, async (req, res) => {
    try {
      // Check if user is authorized for this class
      if (req.user?.role === 'class_teacher' && req.user?.assignedClassId !== req.params.classId) {
        if (req.user?.role !== 'admin') {
          return res.status(403).json({ message: "You don't have access to this class" });
        }
      }
      
      const subjects = await firebaseStorage.getSubjectsByClassId(req.params.classId);
      res.json(subjects);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Get subjects taught by the logged-in teacher
  app.get("/api/subjects", isAuthenticated, async (req, res) => {
    try {
      let subjects;
      if (req.user?.role === "admin") {
        subjects = await firebaseStorage.getSubjects();
      } else if (req.user?.role === "subject_teacher") {
        subjects = await firebaseStorage.getSubjectsByTeacherId(req.user?.id);
      } else if (req.user?.role === "class_teacher" && req.user?.assignedClassId) {
        // For class teachers, get subjects for their assigned class
        subjects = await firebaseStorage.getSubjectsByClassId(req.user.assignedClassId);
      } else {
        subjects = [];
      }
      res.json(subjects);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });
  
  // Subject teacher dashboard - get all classes and subjects with submission stats
  app.get("/api/subject-teacher-dashboard", isAuthenticated, async (req, res) => {
    try {
      // Only subject teachers and admins can access this endpoint
      if (req.user?.role !== 'subject_teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get the teacher ID
      const teacherId = req.user?.role === 'subject_teacher'
        ? req.user?.id
        : req.query.teacherId as string;
      
      if (!teacherId) {
        return res.status(400).json({ message: "Teacher ID is required" });
      }
      
      // Get subjects taught by this teacher
      const subjects = await firebaseStorage.getSubjectsByTeacherId(teacherId);
      
      // Get classes assigned to this teacher
      const classes = await firebaseStorage.getClassesByTeacherId(teacherId);
      
      // Get active sessions
      const activeSession = await firebaseStorage.getActiveSession();
      
      // For each subject, get active submission cycles for each class
      const subjectsWithCycles = [];
      
      for (const subject of subjects) {
        const classesForSubject = [];
        
        for (const classItem of classes) {
          // Get active submission cycle for this subject and class
          const activeCycle = await firebaseStorage.getActiveSubmissionCycle(subject.id, classItem.id);
          
          // Get students with submissions for this subject and class
          const studentsWithSubmissions = await firebaseStorage.getStudentsWithSubmissions(
            classItem.id,
            subject.id,
            activeCycle?.id
          );
          
          // Calculate submission stats
          const totalStudents = studentsWithSubmissions.length;
          const submittedCount = studentsWithSubmissions.filter(s => 
            s.submissions.some(sub => sub.status === 'submitted' || sub.status === 'returned')
          ).length;
          const returnedCount = studentsWithSubmissions.filter(s => 
            s.submissions.some(sub => sub.status === 'returned')
          ).length;
          const missingCount = studentsWithSubmissions.filter(s => 
            s.submissions.some(sub => sub.status === 'missing')
          ).length;
          
          classesForSubject.push({
            class: classItem,
            activeCycle,
            stats: {
              totalStudents,
              submittedCount,
              returnedCount,
              missingCount,
              submissionRate: totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0
            }
          });
        }
        
        subjectsWithCycles.push({
          subject,
          classes: classesForSubject
        });
      }
      
      res.json({
        teacher: req.user,
        activeSession,
        subjects: subjectsWithCycles
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch subject teacher dashboard data" });
    }
  });

  // Create a new subject
  app.post("/api/subjects", isAuthenticated, async (req, res) => {
    try {
      if (req.user.role !== "admin" && req.body.teacherId !== req.user.id) {
        return res.status(403).json({ message: "You can only create subjects assigned to yourself" });
      }
      
      const newSubject = await firebaseStorage.createSubject(req.body);
      res.status(201).json(newSubject);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create subject" });
    }
  });

  // Get a specific subject with stats
  app.get("/api/subjects/:subjectId", isAuthenticated, async (req, res) => {
    try {
      // Check if cycleId is provided as a query parameter
      const { cycleId } = req.query;
      const subjectWithStats = await firebaseStorage.getSubjectWithStats(
        req.params.subjectId, 
        cycleId as string | undefined
      );
      
      if (!subjectWithStats) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      res.json(subjectWithStats);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch subject" });
    }
  });

  // Get students for a class with their submission status
  app.get("/api/classes/:classId/subjects/:subjectId/students", isAuthenticated, async (req, res) => {
    try {
      // Check if cycleId query parameter is provided
      const { cycleId } = req.query;
      
      const studentsWithSubmissions = await firebaseStorage.getStudentsWithSubmissions(
        req.params.classId, 
        req.params.subjectId,
        cycleId as string | undefined
      );
      
      res.json(studentsWithSubmissions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch students with submissions" });
    }
  });

  // Get submissions for a class and subject
  app.get("/api/classes/:classId/subjects/:subjectId/submissions", isAuthenticated, async (req, res) => {
    try {
      // Check if cycleId query parameter is provided
      const { cycleId } = req.query;
      
      const submissions = await firebaseStorage.getSubmissionsForClassAndSubject(
        req.params.classId,
        req.params.subjectId,
        cycleId as string | undefined
      );
      
      res.json(submissions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Submission cycles
  app.get("/api/subjects/:subjectId/cycles", isAuthenticated, async (req, res) => {
    try {
      const cycles = await firebaseStorage.getSubmissionCyclesBySubject(req.params.subjectId);
      res.json(cycles);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch submission cycles" });
    }
  });

  app.get("/api/subjects/:subjectId/classes/:classId/active-cycle", isAuthenticated, async (req, res) => {
    try {
      const cycle = await firebaseStorage.getActiveSubmissionCycle(
        req.params.subjectId,
        req.params.classId
      );
      
      if (!cycle) {
        return res.status(404).json({ message: "No active submission cycle found" });
      }
      
      res.json(cycle);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch active cycle" });
    }
  });

  app.post("/api/cycles", isAuthenticated, async (req, res) => {
    try {
      // Get the subject to check if the teacher has permission
      const subject = await firebaseStorage.getSubject(req.body.subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      // Check permission
      if (req.user.role !== "admin" && subject.teacherId !== req.user.id) {
        return res.status(403).json({ message: "You can only create cycles for your own subjects" });
      }
      
      // Parse dates
      if (req.body.startDate && typeof req.body.startDate === 'string') {
        req.body.startDate = new Date(req.body.startDate);
      }
      
      if (req.body.endDate && typeof req.body.endDate === 'string') {
        req.body.endDate = new Date(req.body.endDate);
      }
      
      const cycle = await firebaseStorage.createSubmissionCycle({
        ...req.body,
        createdBy: req.user.id
      });
      
      res.status(201).json(cycle);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create submission cycle" });
    }
  });

  app.post("/api/cycles/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const cycle = await firebaseStorage.getSubmissionCycle(req.params.id);
      if (!cycle) {
        return res.status(404).json({ message: "Submission cycle not found" });
      }
      
      // Get the subject to check if the teacher has permission
      const subject = await firebaseStorage.getSubject(cycle.subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      // Check permission
      if (req.user.role !== "admin" && subject.teacherId !== req.user.id) {
        return res.status(403).json({ message: "You can only complete cycles for your own subjects" });
      }
      
      const completedCycle = await firebaseStorage.completeSubmissionCycle(req.params.id);
      res.json(completedCycle);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to complete cycle" });
    }
  });

  // Mark a submission as submitted
  app.post("/api/submissions", isAuthenticated, async (req, res) => {
    try {
      // Validate the submission data
      const requiredFields = ['studentId', 'subjectId', 'cycleId', 'status'];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({ message: `Missing required field: ${field}` });
        }
      }

      if (!['submitted', 'returned', 'missing'].includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid status, must be 'submitted', 'returned', or 'missing'" });
      }
      
      const submissionData: SubmissionInput = {
        studentId: req.body.studentId,
        subjectId: req.body.subjectId,
        cycleId: req.body.cycleId,
        status: req.body.status,
        notes: req.body.notes,
        followUpRequired: req.body.followUpRequired
      };
      
      const submission = await firebaseStorage.createSubmission(submissionData);
      res.status(201).json(submission);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create submission" });
    }
  });

  // Update a submission's status
  app.patch("/api/submissions/:id", isAuthenticated, async (req, res) => {
    try {
      const { status, notes, followUpRequired } = req.body;
      if (status && !["submitted", "returned", "missing"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedSubmission = await firebaseStorage.updateSubmission(req.params.id, {
        status,
        notes,
        followUpRequired
      });
      
      res.json(updatedSubmission);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update submission" });
    }
  });

  // Mark a submission as returned
  app.post("/api/submissions/:id/mark-returned", isAuthenticated, async (req, res) => {
    try {
      const updatedSubmission = await firebaseStorage.markSubmissionAsReturned(req.params.id);
      res.json(updatedSubmission);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to mark submission as returned" });
    }
  });

  // Mark all submissions as returned for a cycle
  app.post("/api/cycles/:cycleId/mark-all-returned", isAuthenticated, async (req, res) => {
    try {
      const count = await firebaseStorage.markAllSubmissionsAsReturned(req.params.cycleId);
      res.json({ message: `${count} submissions marked as returned` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to mark all submissions as returned" });
    }
  });

  // Students
  app.get("/api/classes/:classId/students", isAuthenticated, async (req, res) => {
    try {
      // Check if user is authorized for this class
      if (req.user?.role === 'class_teacher' && req.user?.assignedClassId !== req.params.classId) {
        if (req.user?.role !== 'admin') {
          return res.status(403).json({ message: "You don't have access to this class" });
        }
      }
      
      const students = await firebaseStorage.getStudentsByClassId(req.params.classId);
      res.json(students);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post("/api/students", isAuthenticated, async (req, res) => {
    try {
      // Validate the student data
      const requiredFields = ['fullName', 'scholarNumber', 'rollNumber', 'classId', 'parentName'];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({ message: `Missing required field: ${field}` });
        }
      }
      
      // Validate scholar number (5 digits)
      if (!/^\d{5}$/.test(req.body.scholarNumber)) {
        return res.status(400).json({ message: "Scholar number must be 5 digits" });
      }
      
      const student = await firebaseStorage.createStudent(req.body);
      res.status(201).json(student);
    } catch (error) {
      console.error(error);
      if (error.message === 'Scholar number already exists') {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create student" });
    }
  });

  app.patch("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      // Only class teachers and admins can update students
      if (req.user?.role !== 'class_teacher' && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only class teachers and admins can update students" });
      }
      
      // If class teacher, check if student belongs to their class
      if (req.user?.role === 'class_teacher' && req.user?.assignedClassId) {
        const student = await firebaseStorage.getStudent(req.params.id);
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        if (student.classId !== req.user.assignedClassId) {
          return res.status(403).json({ message: "You can only update students in your assigned class" });
        }
      }
      
      // Don't allow changing scholar number
      if (req.body.scholarNumber) {
        delete req.body.scholarNumber;
      }
      
      const student = await firebaseStorage.updateStudent(req.params.id, req.body);
      res.json(student);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  app.post("/api/students/:id/change-class", isAuthenticated, async (req, res) => {
    try {
      // Only admins can change a student's class (since this affects multiple classes)
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only administrators can change a student's class" });
      }
      
      const { newClassId, reason } = req.body;
      if (!newClassId) {
        return res.status(400).json({ message: "New class ID is required" });
      }
      
      const student = await firebaseStorage.changeStudentClass(
        req.params.id,
        newClassId,
        reason,
        req.user?.id
      );
      
      res.json(student);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to change student's class" });
    }
  });

  app.get("/api/students/:id/class-history", isAuthenticated, async (req, res) => {
    try {
      // Only admins and class teachers can view class history
      if (req.user?.role !== 'admin' && req.user?.role !== 'class_teacher') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // If class teacher, make sure the student is in their class
      if (req.user?.role === 'class_teacher' && req.user?.assignedClassId) {
        const student = await firebaseStorage.getStudent(req.params.id);
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        if (student.classId !== req.user.assignedClassId) {
          return res.status(403).json({ message: "You can only view history for students in your assigned class" });
        }
      }
      
      const history = await firebaseStorage.getStudentClassHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch class history" });
    }
  });

  // Send SMS notifications for missing submissions
  app.post("/api/classes/:classId/subjects/:subjectId/send-notifications", isAuthenticated, async (req, res) => {
    try {
      // Check if cycleId is provided
      const { cycleId, templateId } = req.body;
      
      // Get subject details
      const subject = await firebaseStorage.getSubject(req.params.subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      // Get notification template
      let template;
      if (templateId) {
        template = await firebaseStorage.getNotificationTemplate(templateId);
      } else {
        template = await firebaseStorage.getNotificationTemplateByType("missing");
      }
      
      if (!template) {
        return res.status(404).json({ message: "Notification template not found" });
      }

      // Get all students with missing submissions
      const studentsWithSubmissions = await firebaseStorage.getStudentsWithSubmissions(
        req.params.classId, 
        req.params.subjectId,
        cycleId
      );
      
      const missingSubmissions = studentsWithSubmissions.filter(student => 
        student.submissions.some(sub => sub.status === "missing")
      );

      // In a real app, we'd integrate with Twilio/Fast2SMS here
      // For now, just create notification history records
      const notifications = [];
      
      for (const student of missingSubmissions) {
        const submission = student.submissions.find(sub => sub.status === "missing");
        if (submission) {
          // Update submission to mark notification as sent
          await firebaseStorage.updateSubmission(submission.id, { 
            notificationSent: true,
            notificationSentAt: new Date()
          });
          
          // Create message content by replacing placeholders in template
          let messageContent = template.content;
          messageContent = messageContent.replace("{STUDENT_NAME}", student.fullName);
          messageContent = messageContent.replace("{SUBJECT_NAME}", subject.name);
          messageContent = messageContent.replace("{CLASS_NAME}", "Class"); // Need to fetch class name
          
          // Create notification history record
          const notification = await firebaseStorage.createNotificationHistory({
            studentId: student.id,
            submissionId: submission.id,
            messageType: "sms",
            messageContent,
            recipientNumber: student.parentPhone,
            status: "delivered" // In a real app, this would be set based on delivery status
          });
          
          notifications.push(notification);
        }
      }

      res.json({ 
        message: `SMS notifications sent to ${notifications.length} parents`,
        notificationsSent: notifications.length,
        notifications
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to send notifications" });
    }
  });

  // Get submission analytics
  app.get("/api/classes/:classId/subjects/:subjectId/analytics", isAuthenticated, async (req, res) => {
    try {
      // Default to last 30 days if not specified
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // Check if date range is provided
      if (req.query.startDate && req.query.endDate) {
        const queryStartDate = new Date(req.query.startDate as string);
        const queryEndDate = new Date(req.query.endDate as string);
        
        if (!isNaN(queryStartDate.getTime()) && !isNaN(queryEndDate.getTime())) {
          startDate.setTime(queryStartDate.getTime());
          endDate.setTime(queryEndDate.getTime());
        }
      }

      const analytics = await firebaseStorage.getSubmissionAnalytics(
        req.params.classId, 
        req.params.subjectId, 
        startDate, 
        endDate
      );
      
      res.json(analytics);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get potential defaulters with AI prediction
  app.get("/api/classes/:classId/defaulters", isAuthenticated, async (req, res) => {
    try {
      const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 2;
      
      // Get the class to verify access
      const classData = await firebaseStorage.getClass(req.params.classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      // Verify permissions (Only admin, class teacher of this class, or a teacher with a subject in this class can view)
      const isClassTeacher = req.user?.role === 'class_teacher' && req.user?.assignedClassId === req.params.classId;
      const isAdmin = req.user?.role === 'admin';
      
      if (!isAdmin && !isClassTeacher) {
        // For subject teachers, check if they teach any subject in this class
        const userSubjects = await firebaseStorage.getSubjectsByTeacherId(req.user?.id || '');
        const hasSubjectInClass = userSubjects.some(subject => 
          subject.classIds && subject.classIds.includes(req.params.classId)
        );
        
        if (!hasSubjectInClass) {
          return res.status(403).json({ message: "You don't have permission to view defaulters for this class" });
        }
      }
      
      // Get students with submissions (includes history)
      const studentsWithSubmissions = await firebaseStorage.getStudentsWithHistory(req.params.classId);
      
      // Import the defaulter prediction service
      const { defaulterPredictionService } = await import('./defaulter-prediction');
      
      // Map data to the format expected by the prediction service
      const studentHistories = studentsWithSubmissions.map(student => ({
        studentId: student.id,
        studentName: student.fullName, 
        scholarNumber: student.scholarNumber,
        submissions: student.submissions.map(sub => ({
          studentId: student.id,
          submissionId: sub.id,
          status: sub.status,
          submittedAt: sub.submittedAt ? sub.submittedAt.toDate() : undefined,
          returnedAt: sub.returnedAt ? sub.returnedAt.toDate() : undefined,
          dueDate: undefined, // Not used in our system
          cycleId: sub.cycleId,
          cycleStartDate: sub.date.toDate() // Use the submission date as cycleStartDate
        })),
        previousMissingCount: student.previousMissingCount || 0
      }));
      
      // Use the prediction service to identify potential defaulters
      const defaulters = defaulterPredictionService.predictDefaulters(studentHistories, threshold);
      
      res.json(defaulters);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch potential defaulters" });
    }
  });

  // Notification templates
  app.get("/api/notification-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await firebaseStorage.getNotificationTemplates();
      res.json(templates);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch notification templates" });
    }
  });

  app.post("/api/notification-templates", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.createNotificationTemplate({
        ...req.body,
        createdBy: req.user.id
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create notification template" });
    }
  });
  
  // AI-Powered Defaulter Prediction
  app.get("/api/classes/:classId/ai-predict-defaulters", isAuthenticated, async (req, res) => {
    try {
      const threshold = req.query.threshold ? parseInt(req.query.threshold as string) : 2;
      
      // Get the class to verify access
      const classData = await storage.getClass(req.params.classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      // Verify permissions (Only admin or class teacher of this class can view)
      const isClassTeacher = req.user?.role === 'class_teacher' && req.user?.assignedClassId === req.params.classId;
      const isAdmin = req.user?.role === 'admin';
      
      if (!isAdmin && !isClassTeacher) {
        return res.status(403).json({ message: "You don't have permission to access this resource" });
      }
      
      // Get students with submission history for prediction
      const studentsHistory = await storage.getPotentialDefaulters(req.params.classId, threshold);
      
      // Use AI service to predict defaulters
      const predictions = defaulterPredictionService.predictDefaulters(studentsHistory, threshold);
      
      res.json(predictions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to predict defaulters" });
    }
  });
  
  // Send notifications to defaulter students' parents
  app.post("/api/classes/:classId/send-defaulter-notifications", isAuthenticated, async (req, res) => {
    try {
      const { threshold } = req.body;
      
      // Verify class exists
      const classData = await storage.getClass(req.params.classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      // Verify permissions
      const isClassTeacher = req.user?.role === 'class_teacher' && req.user?.assignedClassId === req.params.classId;
      const isAdmin = req.user?.role === 'admin';
      
      if (!isAdmin && !isClassTeacher) {
        return res.status(403).json({ message: "You don't have permission to access this resource" });
      }
      
      // Check if Twilio is configured
      if (!twilioService.isReady()) {
        return res.status(503).json({ 
          message: "SMS notification service is not configured. Please set up Twilio credentials.",
          missingSecrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]
        });
      }
      
      // Send defaulter notifications
      const notificationCount = await notificationService.sendDefaulterNotifications(
        req.params.classId, 
        threshold || 2
      );
      
      res.json({ 
        success: true, 
        message: `Sent ${notificationCount} defaulter notifications`,
        notificationCount
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to send defaulter notifications" });
    }
  });
  
  // Enhanced endpoint for sending missing submission notifications
  app.post("/api/classes/:classId/subjects/:subjectId/send-missing-notifications", isAuthenticated, async (req, res) => {
    try {
      const { cycleId } = req.body;
      
      if (!cycleId) {
        return res.status(400).json({ message: "Cycle ID is required" });
      }
      
      // Verify subject and class exist
      const subject = await storage.getSubject(req.params.subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      
      const classData = await storage.getClass(req.params.classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      // Check if Twilio is configured
      if (!twilioService.isReady()) {
        return res.status(503).json({ 
          message: "SMS notification service is not configured. Please set up Twilio credentials.",
          missingSecrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]
        });
      }
      
      // Send missing submission notifications
      const notificationCount = await notificationService.sendMissingSubmissionNotifications(
        req.params.classId,
        req.params.subjectId,
        cycleId
      );
      
      res.json({
        success: true,
        message: `Sent ${notificationCount} missing submission notifications`,
        notificationCount
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to send missing submission notifications" });
    }
  });
  
  // Check Twilio service status
  app.get("/api/notification-service/status", isAuthenticated, async (req, res) => {
    try {
      // Only admins can check service status
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const isConfigured = twilioService.isReady();
      
      res.json({
        service: "Twilio SMS",
        status: isConfigured ? "configured" : "not configured",
        isReady: isConfigured,
        missingSecrets: isConfigured ? [] : ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to check notification service status" });
    }
  });
  
  // Initialize default notification templates
  app.post("/api/notification-templates/initialize-defaults", isAuthenticated, async (req, res) => {
    try {
      // Only admins can initialize default templates
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await notificationService.initializeDefaultTemplates(req.user.id);
      
      const templates = await storage.getNotificationTemplates();
      
      res.json({
        success: true,
        message: "Default notification templates initialized",
        templates
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to initialize default templates" });
    }
  });

  return httpServer;
}
