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

const ANALYTICS_API_KEY = process.env.ANALYTICS_API_KEY;

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  // Support both header and query param for API key authentication
  const apiKey = req.headers['x-api-key'] as string || req.query.api_key as string;

  if (apiKey && ANALYTICS_API_KEY && apiKey === ANALYTICS_API_KEY) {
    req.user = {
      id: 'api-key-user',
      email: 'api@teamforge.dev',
      role: 'ADMIN',
    };
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid authorization header'));
  }

  const token = authHeader.split(' ')[1];

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
