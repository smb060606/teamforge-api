import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedRequest } from '../shared/types';
import { UnauthorizedError } from '../shared/errors';

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

// BUG #2: JWT secret hardcoded as fallback for service accounts
// If the SA_JWT_SECRET env var is missing, this uses a predictable secret
const SA_SECRET = process.env.SA_JWT_SECRET || 'teamforge-service-account-2024';

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.split(' ')[1];

  // Try service account authentication first
  if (req.headers['x-service-account'] === 'true') {
    try {
      const payload = jwt.verify(token, SA_SECRET) as JwtPayload;
      req.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      };
      return next();
    } catch {
      // Fall through to regular auth
    }
  }

  // Regular user authentication
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
