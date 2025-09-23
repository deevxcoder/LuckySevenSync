import type { Express } from "express";

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
}
