import type { Express } from "express";
import { storage } from "./storage";
import { insertUserSchema } from "../shared/schema";
import { requireAuth, requireAdmin, optionalAuth, type AuthRequest } from "./middleware/auth";
// Session types are defined globally in server/types/session.d.ts

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

  // Get recent game results
  app.get("/api/games/recent", async (req, res) => {
    try {
      const games = await storage.getGameHistory(10);
      res.json(games);
    } catch (error) {
      console.error('Error fetching recent games:', error);
      res.status(500).json({ message: "Failed to fetch recent games" });
    }
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
      
      // Store user in session (without password hash)
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      };
      
      // Return user without password
      res.status(201).json({
        id: user.id,
        username: user.username,
        role: user.role
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

      // Store user in session (without password hash)
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      };

      // Return user without password
      res.json({
        id: user.id,
        username: user.username,
        role: user.role
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    // Destroy server session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // User stats routes - requires authentication
  app.get("/api/users/:userId/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Users can only access their own stats (unless admin)
      if (req.user!.id !== userId && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
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

  // Admin routes - requires admin role
  app.get("/api/admin/users", requireAdmin, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Return users without passwords
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      }));

      res.json(safeUsers);
    } catch (error) {
      console.error('Admin users error:', error);
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });

  // Special route to create first admin user (protected by setup token)
  app.post("/api/admin/create-first-admin", async (req, res) => {
    try {
      // Require setup token for security
      const setupToken = req.headers['x-setup-token'] || req.body.setupToken;
      const requiredToken = process.env.ADMIN_SETUP_TOKEN;
      
      if (!requiredToken) {
        return res.status(503).json({ message: "Admin setup not configured" });
      }
      
      if (!setupToken || setupToken !== requiredToken) {
        return res.status(401).json({ message: "Invalid setup token" });
      }

      // Check if any admin users already exist
      const users = await storage.getAllUsers();
      const hasAdmin = users.some(user => user.role === 'admin');
      
      if (hasAdmin) {
        return res.status(400).json({ message: "Admin user already exists" });
      }

      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Create admin user
      const adminUser = await storage.createAdminUser({ username, password });
      
      // Store admin in session (without password hash)
      req.session.user = {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
        createdAt: adminUser.createdAt
      };

      res.status(201).json({
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role
      });
    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({ message: "Failed to create admin user" });
    }
  });
}
