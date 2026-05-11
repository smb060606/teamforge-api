import { Response, NextFunction } from 'express';
import * as incidentsService from './incidents.service';
import * as timelineService from './timeline.service';
import * as escalationService from './escalation.service';
import { AuthenticatedRequest } from '../../shared/types';
import { parsePagination } from '../../shared/pagination';

export async function createIncident(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const incident = await incidentsService.createIncident(req.user!.id, req.body);
    res.status(201).json(incident);
  } catch (err) {
    next(err);
  }
}

export async function getIncident(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const incident = await incidentsService.getIncident(req.params.id as string);
    res.json(incident);
  } catch (err) {
    next(err);
  }
}

export async function listIncidents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const params = parsePagination(req.query as Record<string, unknown>);
    const { projectId, severity, status } = req.query;
    const result = await incidentsService.listIncidents(
      params,
      projectId as string | undefined,
      severity as string | undefined,
      status as string | undefined,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateIncident(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const incident = await incidentsService.updateIncident(req.params.id as string, req.body);
    res.json(incident);
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const incident = await incidentsService.updateIncidentStatus(
      req.params.id as string,
      req.user!.id,
      req.body.status,
    );
    res.json(incident);
  } catch (err) {
    next(err);
  }
}

export async function assignIncident(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const incident = await incidentsService.assignIncident(req.params.id as string, req.body);
    res.json(incident);
  } catch (err) {
    next(err);
  }
}

export async function addTimelineEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const entry = await incidentsService.addTimelineEntry(
      req.params.id as string,
      req.user!.id,
      req.body,
    );
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

export async function getTimeline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const timeline = await timelineService.getTimeline(req.params.id as string);
    res.json(timeline);
  } catch (err) {
    next(err);
  }
}

export async function searchIncidents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { query, severity, status, projectId } = req.query;
    const results = await incidentsService.searchIncidents(
      query as string | undefined,
      severity as string | undefined,
      status as string | undefined,
      projectId as string | undefined,
    );
    res.json(results);
  } catch (err) {
    next(err);
  }
}

export async function getMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const projectId = req.query.projectId as string | undefined;
    const metrics = await incidentsService.getIncidentMetrics(projectId);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
}

export async function checkEscalations(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const escalations = await escalationService.checkAndEscalate();
    res.json({ escalations, count: escalations.length });
  } catch (err) {
    next(err);
  }
}
