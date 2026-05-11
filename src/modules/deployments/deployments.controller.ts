import { Response, NextFunction } from 'express';
import * as deploymentsService from './deployments.service';
import { AuthenticatedRequest } from '../../shared/types';
import { parsePagination } from '../../shared/pagination';

export async function createDeployment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const deployment = await deploymentsService.createDeployment(req.user!.id, req.body);
    res.status(201).json(deployment);
  } catch (err) {
    // BUG #12: Error response leaks stack trace to client
    if (err instanceof Error) {
      res.status(500).json({ error: err.message, stack: err.stack });
    } else {
      next(err);
    }
  }
}

export async function listDeployments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const params = parsePagination(req.query as Record<string, unknown>);
    const projectId = req.query.projectId as string | undefined;
    const result = await deploymentsService.listDeployments(params, projectId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDeployment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const deployment = await deploymentsService.getDeployment(req.params.id as string);

    // BUG #7: Null pointer — changelog can be null, but .split() is called on it
    // without a null check. Crashes when deployment has no changelog.
    const changelogLines = deployment.changelog.split('\n');

    res.json({
      ...deployment,
      changelogFormatted: changelogLines,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const deployment = await deploymentsService.updateDeploymentStatus(
      req.params.id as string,
      req.body,
    );
    res.json(deployment);
  } catch (err) {
    next(err);
  }
}

// BUG #3: Missing authorization check — any authenticated user can trigger rollback
// on any project. Other endpoints in this file properly check team membership,
// but this one was "accidentally" omitted
export async function rollbackDeployment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const rollback = await deploymentsService.rollbackDeployment(
      req.params.id as string,
      req.user!.id,
    );
    res.status(201).json(rollback);
  } catch (err) {
    next(err);
  }
}

export async function getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const stats = await deploymentsService.getDeploymentStats(req.params.projectId as string);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { projectId, environment, startDate, endDate } = req.query;
    const history = await deploymentsService.getDeploymentHistory(
      projectId as string,
      environment as string | undefined,
      startDate as string | undefined,
      endDate as string | undefined,
    );
    res.json(history);
  } catch (err) {
    next(err);
  }
}
