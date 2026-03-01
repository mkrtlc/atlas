import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AdminPayload {
  role: 'system_admin';
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AdminPayload;

    if (payload.role !== 'system_admin') {
      res.status(403).json({ success: false, error: 'Insufficient privileges' });
      return;
    }

    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired admin token' });
  }
}
