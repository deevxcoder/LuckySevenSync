import type { Express } from "express";
import { storage } from "./storage";
import { insertUserSchema } from "../shared/schema";

export async function registerRoutes(app: Express): Promise<void> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get active rooms
  app.get("/api/rooms", (req, res) => {
    // This will be populated by the game manager
    res.json({ rooms: [] });
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create user
      const user = await storage.createUser(validatedData);
      
      // Return user without password
      res.status(201).json({
        id: user.id,
        username: user.username
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Verify user credentials
      const user = await storage.verifyUserPassword(username, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Return user without password
      res.json({
        id: user.id,
        username: user.username
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    // For this simple implementation, logout is handled client-side
    res.json({ success: true });
  });

  // User stats routes
  app.get("/api/users/:userId/stats", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Get user statistics
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // For now, return basic stats
      // This could be expanded to include game history, win/loss ratio, etc.
      res.json({
        username: user.username,
        gamesPlayed: 0, // Placeholder
        totalWins: 0,   // Placeholder
        totalLosses: 0, // Placeholder
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ message: "Failed to retrieve user stats" });
    }
  });

  // Admin routes (basic implementation)
  app.get("/api/admin/users", async (req, res) => {
    try {
      // This is a basic implementation - in a real app you'd check admin permissions
      const users = await storage.getAllUsers();
      
      // Return users without passwords
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username
      }));

      res.json(safeUsers);
    } catch (error) {
      console.error('Admin users error:', error);
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });
}
