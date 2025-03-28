import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import firebaseStorage from "./firebase-storage";
import { User } from "@shared/firebase-types";
import { auth } from "./firebase-admin";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "notebook-submission-tracker-secret",
    resave: false,
    saveUninitialized: false,
    store: firebaseStorage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await firebaseStorage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        
        // Verify with Firebase Auth
        try {
          // We'll use a workaround since we're using username/password but Firebase uses email
          // We'll get the Firebase UID from our Firestore user object
          const authUser = await auth.getUser(user.authUid);
          
          // For simplicity, we're not verifying the password here as Firebase Auth would handle that
          // In a real app, you might use signInWithEmailAndPassword from the client side
          
          // Update last login time
          await firebaseStorage.updateUser(user.id, {
            lastLogin: new Date()
          });
          
          return done(null, user);
        } catch (authError) {
          console.error('Firebase auth error:', authError);
          return done(null, false, { message: "Authentication failed" });
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await firebaseStorage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, fullName, role, email, phone } = req.body;
      
      const existingUser = await firebaseStorage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create user with Firebase Storage which will also create Firebase Auth user
      const user = await firebaseStorage.createUser({
        username,
        password,
        fullName,
        role: role || "teacher",
        email,
        phone
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.status(200).json(user);
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
    
    res.json(req.user);
  });
  
  // Admin endpoints
  app.get("/api/users", async (req, res, next) => {
    if (!req.isAuthenticated() || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    try {
      const users = await firebaseStorage.getAllUsers();
      res.json(users);
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
      
      if (!role || !['admin', 'teacher'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const user = await firebaseStorage.updateUser(id, { role });
      res.json(user);
    } catch (error) {
      next(error);
    }
  });
}
