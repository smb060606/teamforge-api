import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { parsePagination } from '../../shared/pagination';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const params = parsePagination(req.query as Record<string, unknown>);
    const result = await usersService.listUsers(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getUser(req.params.id as string);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.updateUser(req.params.id as string, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await usersService.deleteUser(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
