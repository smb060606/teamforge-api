import { Response, NextFunction } from 'express';
import * as teamsService from './teams.service';
import { AuthenticatedRequest } from '../../shared/types';
import { parsePagination } from '../../shared/pagination';

export async function listTeams(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const params = parsePagination(req.query as Record<string, unknown>);
    const result = await teamsService.listTeams(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const team = await teamsService.getTeam(req.params.id as string);
    res.json(team);
  } catch (err) {
    next(err);
  }
}

export async function createTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const team = await teamsService.createTeam(req.user!.id, req.body);
    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
}

export async function updateTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const team = await teamsService.updateTeam(req.params.id as string, req.user!.id, req.body);
    res.json(team);
  } catch (err) {
    next(err);
  }
}

export async function deleteTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await teamsService.deleteTeam(req.params.id as string, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function addMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const member = await teamsService.addMember(req.params.id as string, req.user!.id, req.body);
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    await teamsService.removeMember(req.params.id as string, req.params.memberId as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
