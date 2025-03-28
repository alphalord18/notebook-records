import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertSubmissionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Get all classes for the logged-in teacher
  app.get("/api/classes", isAuthenticated, async (req, res) => {
    try {
      let classes;
      if (req.user.role === "admin") {
        classes = await storage.getClasses();
      } else {
        classes = await storage.getClassesByTeacherId(req.user.id);
      }
      res.json(classes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  // Get all subjects for a class
  app.get("/api/classes/:classId/subjects", isAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }

      const subjects = await storage.getSubjectsByClassId(classId);
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Get subjects taught by the logged-in teacher
  app.get("/api/subjects", isAuthenticated, async (req, res) => {
    try {
      let subjects;
      if (req.user.role === "admin") {
        subjects = await storage.getSubjects();
      } else {
        subjects = await storage.getSubjectsByTeacherId(req.user.id);
      }
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Get students for a class with their submission status
  app.get("/api/classes/:classId/subjects/:subjectId/students", isAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const subjectId = parseInt(req.params.subjectId);
      
      if (isNaN(classId) || isNaN(subjectId)) {
        return res.status(400).json({ message: "Invalid class or subject ID" });
      }

      // Check if date query parameter is provided
      let date: Date | undefined;
      if (req.query.date) {
        date = new Date(req.query.date as string);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
      } else {
        date = new Date(); // Default to today
      }

      const studentsWithSubmissions = await storage.getStudentsWithSubmissions(classId, subjectId, date);
      res.json(studentsWithSubmissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch students with submissions" });
    }
  });

  // Get submissions for a class and subject
  app.get("/api/classes/:classId/subjects/:subjectId/submissions", isAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const subjectId = parseInt(req.params.subjectId);
      
      if (isNaN(classId) || isNaN(subjectId)) {
        return res.status(400).json({ message: "Invalid class or subject ID" });
      }

      // Check if date query parameter is provided
      let date: Date | undefined;
      if (req.query.date) {
        date = new Date(req.query.date as string);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
      }

      const submissions = await storage.getSubmissionsForClassAndSubject(classId, subjectId, date);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Mark a submission as submitted
  app.post("/api/submissions", isAuthenticated, async (req, res) => {
    try {
      const submissionData = insertSubmissionSchema.parse(req.body);
      const submission = await storage.createSubmission({
        ...submissionData,
        submittedAt: new Date(),
      });
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid submission data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create submission" });
    }
  });

  // Update a submission's status
  app.patch("/api/submissions/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      const { status } = req.body;
      if (!status || !["submitted", "returned", "missing"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      let updates: any = { status };
      
      if (status === "submitted") {
        updates.submittedAt = new Date();
      } else if (status === "returned") {
        updates.returnedAt = new Date();
      }

      const updatedSubmission = await storage.updateSubmission(id, updates);
      res.json(updatedSubmission);
    } catch (error) {
      res.status(500).json({ message: "Failed to update submission" });
    }
  });

  // Mark a submission as returned
  app.post("/api/submissions/:id/mark-returned", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      const updatedSubmission = await storage.markSubmissionAsReturned(id);
      res.json(updatedSubmission);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark submission as returned" });
    }
  });

  // Mark all submissions as returned for a class and subject
  app.post("/api/classes/:classId/subjects/:subjectId/mark-all-returned", isAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const subjectId = parseInt(req.params.subjectId);
      
      if (isNaN(classId) || isNaN(subjectId)) {
        return res.status(400).json({ message: "Invalid class or subject ID" });
      }

      // Check if date is provided in the body
      let date: Date | undefined;
      if (req.body.date) {
        date = new Date(req.body.date);
        if (isNaN(date.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
      } else {
        date = new Date(); // Default to today
      }

      const count = await storage.markAllSubmissionsAsReturned(classId, subjectId, date);
      res.json({ message: `${count} submissions marked as returned` });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all submissions as returned" });
    }
  });

  // Send SMS notifications for missing submissions
  app.post("/api/classes/:classId/subjects/:subjectId/send-notifications", isAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const subjectId = parseInt(req.params.subjectId);
      
      if (isNaN(classId) || isNaN(subjectId)) {
        return res.status(400).json({ message: "Invalid class or subject ID" });
      }

      // Get subject details
      const subject = await storage.getSubject(subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      // Get all students with missing submissions
      const studentsWithSubmissions = await storage.getStudentsWithSubmissions(classId, subjectId);
      const missingSubmissions = studentsWithSubmissions.filter(student => 
        student.submissions.some(sub => sub.status === "missing")
      );

      // In a real app, we'd integrate with Twilio/Fast2SMS here
      // For now, just mark the notifications as sent
      for (const student of missingSubmissions) {
        const submission = student.submissions.find(sub => sub.status === "missing");
        if (submission) {
          await storage.updateSubmission(submission.id, { notificationSent: true });
        }
      }

      res.json({ 
        message: `SMS notifications sent to ${missingSubmissions.length} parents`,
        notificationsSent: missingSubmissions.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to send notifications" });
    }
  });

  // Get submission analytics
  app.get("/api/classes/:classId/subjects/:subjectId/analytics", isAuthenticated, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const subjectId = parseInt(req.params.subjectId);
      
      if (isNaN(classId) || isNaN(subjectId)) {
        return res.status(400).json({ message: "Invalid class or subject ID" });
      }

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

      const analytics = await storage.getSubmissionAnalytics(classId, subjectId, startDate, endDate);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  return httpServer;
}
