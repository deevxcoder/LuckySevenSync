import { User } from '@shared/schema';

// Session user type without sensitive data
export interface SessionUser {
  id: number;
  username: string;
  role: string;
  createdAt: Date;
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}