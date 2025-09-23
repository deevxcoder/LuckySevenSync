import { Request, Response, NextFunction } from 'express';
import { SessionUser } from '../types/session';

export interface AuthRequest extends Request {
  user?: SessionUser;
}

// Middleware to check if user is authenticated
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  req.user = req.session.user;
  next();
};

// Middleware to check if user is admin
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  req.user = req.session.user;
  next();
};

// Middleware to attach user to request if authenticated (optional auth)
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.session?.user) {
    req.user = req.session.user;
  }
  next();
};