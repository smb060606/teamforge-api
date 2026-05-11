import { Response, NextFunction } from 'express';
import * as projectsService from './projects.service';
import { AuthenticatedRequest } from '../../shared/types';
import { parsePagination } from '../../shared/pagination';

export async function listProjects(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const params = parsePagination(req.query as Record<string, unknown>);
    const teamId = req.query.teamId as string | undefined;
    const result = await projectsService.listProjects(params, teamId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const project = await projectsService.getProject(req.params.id as string);
    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function createProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const project = await projectsService.createProject(req.user!.id, req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const project = await projectsService.updateProject(req.params.id as string, req.body);
    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await projectsService.deleteProject(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
