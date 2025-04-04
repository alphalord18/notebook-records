import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User } from "@shared/firebase-types";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { Timestamp } from "./firebase-admin";

declare global {
  namespace Express {
    // Define the User interface for Express session
    interface User {
      id: string;
      username: string;
      fullName: string;
      role: "subject_teacher" | "class_teacher" | "admin";
      email?: string;
      phone?: string;
      avatarInitials?: string;
      assignedClassId?: string;
      assignedSubjectId?: string;
    }
  }
}

// Initialize scrypt as a Promise
const scryptAsync = promisify(scrypt);

// Functions for password hashing and validation
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${derivedKey.toString("hex")}.${salt}`;
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [hash, salt] = hashedPassword.split(".");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(hash, "hex");
  return timingSafeEqual(derivedKey, storedKey);
}

// Create initial admin and teacher users if they don't exist
async function createInitialUsers() {
  // Check if admin exists
  const adminUser = await storage.getUserByUsername("admin");
  if (!adminUser) {
    console.log("Creating admin user...");
    const hashedPassword = await hashPassword("admin123");
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      fullName: "System Admin",
      role: "admin",
      email: "admin@school.edu",
      phone: "1234567890",
      avatarInitials: "SA"
    });
  }
  
  // Check if subject teacher exists
  const subjectTeacher = await storage.getUserByUsername("subject");
  if (!subjectTeacher) {
    console.log("Creating subject teacher user...");
    const hashedPassword = await hashPassword("subject123");
    await storage.createUser({
      username: "subject",
      password: hashedPassword,
      fullName: "Math Teacher",
      role: "subject_teacher", 
      email: "math@school.edu",
      phone: "9876543210",
      avatarInitials: "MT"
      // assignedSubjectId will be set during data initialization
    });
  }
  
  // Check if class teacher exists
  const classTeacher = await storage.getUserByUsername("class");
  if (!classTeacher) {
    console.log("Creating class teacher user...");
    const hashedPassword = await hashPassword("class123");
    await storage.createUser({
      username: "class",
      password: hashedPassword,
      fullName: "Class Teacher",
      role: "class_teacher", 
      email: "class@school.edu",
      phone: "5555555555",
      avatarInitials: "CT"
      // assignedClassId will be set during data initialization
    });
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "notebook-submission-tracker-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Create initial users
  createInitialUsers().catch(error => {
    console.error("Error creating initial users:", error);
  });

  passport.use(
    new LocalStrategy(async (username: string, password: string, done: any) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        // Verify password
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Incorrect username or password" });
        }
        
        // Skip updating last login for now due to timestamp incompatibility issues
        // await storage.updateUser(user.id, {
        //   lastLogin: Timestamp.now()
        // });
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: any, done: any) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done: any) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // No registration endpoint as per requirements

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // Don't send the password hash to the client
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Don't send the password hash to the client
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });
  
  // Admin endpoints
  app.get("/api/users", async (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const users = await storage.getAllUsers();
      
      // Remove password hashes before sending to client
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/user/:id/role", async (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      const validRoles = ['admin', 'subject_teacher', 'class_teacher'];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.updateUser(id, { role });
      
      // Remove password hash before sending to client
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
}
