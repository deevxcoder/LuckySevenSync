import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { GameManager } from "./gameManager";
import { AndarBaharManager } from "./andarBaharManager";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'lucky-7-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

app.use(sessionMiddleware);

// Create HTTP server and Socket.io instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Share session with Socket.io
io.engine.use(sessionMiddleware);

// Initialize game managers
const gameManager = new GameManager(io);
const andarBaharManager = new AndarBaharManager(io);

// Attach game managers to app for route access
(app as any).gameManager = gameManager;
(app as any).andarBaharManager = andarBaharManager;

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Socket.io connection handling
  io.on('connection', (socket) => {
    log(`Player connected: ${socket.id}`);
    
    socket.on('join-lobby', async () => {
      await gameManager.addPlayerToLobby(socket);
    });

    socket.on('join-room', async (roomId: string) => {
      await gameManager.joinRoom(socket, roomId);
    });

    socket.on('leave-room', () => {
      gameManager.leaveRoom(socket);
    });

    socket.on('start-game', async (roomId: string) => {
      await gameManager.startGame(socket, roomId);
    });

    // Andar Bahar event handlers
    socket.on('andar-bahar-join', async (data: { betAmount: number; userId: number; username: string }) => {
      try {
        if (!data.userId || !data.username) {
          socket.emit('error', 'Authentication required');
          return;
        }
        
        // Get or create player record
        const player = await storage.createOrUpdatePlayerByUserId(data.userId, socket.id, data.username);
        if (!player) {
          socket.emit('error', 'Player not found');
          return;
        }

        await andarBaharManager.joinMatchmaking(socket, player, data.betAmount);
      } catch (error) {
        console.error('Error joining Andar Bahar:', error);
        socket.emit('error', 'Failed to join matchmaking');
      }
    });

    socket.on('andar-bahar-choice', async (data: { matchId: string; choice: 'andar' | 'bahar' }) => {
      await andarBaharManager.makeChoice(socket, data.matchId, data.choice);
    });

    socket.on('andar-bahar-leave', async (data: { userId: number }) => {
      try {
        if (data.userId) {
          const player = await storage.getPlayerByUserId(data.userId);
          if (player) {
            andarBaharManager.leaveMatchmaking(player.id);
          }
        }
      } catch (error) {
        console.error('Error leaving Andar Bahar:', error);
      }
    });

    socket.on('disconnect', () => {
      log(`Player disconnected: ${socket.id}`);
      gameManager.handleDisconnect(socket);
    });
  });

  // Setup Vite in development or serve static files in production
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // Serve on port 5000
  const port = 5000;
  httpServer.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server running on port ${port}`);
  });
})();
