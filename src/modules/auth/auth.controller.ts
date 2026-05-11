import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { logger } from '../../config/logger';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    logger.info({ userId: result.user.id }, 'User registered');
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    logger.info({ userId: result.user.id }, 'User logged in');
    res.json(result);
  } catch (err) {
    next(err);
  }
}
