import { Response, NextFunction } from 'express';
import * as analyticsService from './analytics.service';
import * as exportService from './export.service';
import { AuthenticatedRequest } from '../../shared/types';

export async function getVelocity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { projectId, startDate, endDate } = req.query;
    const result = await analyticsService.calculateVelocity(
      projectId as string,
      startDate as string | undefined,
      endDate as string | undefined,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getChangeFailureRate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { projectId, startDate, endDate } = req.query;
    const result = await analyticsService.calculateChangeFailureRate(
      projectId as string,
      startDate as string | undefined,
      endDate as string | undefined,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProjectHealth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await analyticsService.calculateProjectHealth(req.params.projectId as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getContributions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { teamId, startDate, endDate } = req.query;
    const result = await analyticsService.calculateContributions(
      teamId as string,
      startDate as string | undefined,
      endDate as string | undefined,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDateRangeMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { projectId, startDate, endDate } = req.query;
    const result = await analyticsService.getMetricsForDateRange(
      projectId as string,
      startDate as string,
      endDate as string,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function exportReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { reportType, format, callbackUrl } = req.body;
    const { projectId, startDate, endDate } = req.query;

    let data: any;
    switch (reportType) {
      case 'velocity':
        data = await analyticsService.calculateVelocity(
          projectId as string,
          startDate as string | undefined,
          endDate as string | undefined,
        );
        break;
      case 'health':
        data = await analyticsService.calculateProjectHealth(projectId as string);
        break;
      case 'change-failure':
        data = await analyticsService.calculateChangeFailureRate(
          projectId as string,
          startDate as string | undefined,
          endDate as string | undefined,
        );
        break;
      default:
        res.status(400).json({ error: { message: `Unknown report type: ${reportType}` } });
        return;
    }

    if (format === 'csv') {
      const headers = Object.keys(data);
      const csvData = exportService.generateCSV(headers, [data]);

      if (callbackUrl) {
        await exportService.sendExportCallback(callbackUrl, csvData);
        res.json({ success: true, message: 'Report sent to callback URL' });
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.csv`);
        res.send(csvData);
      }
    } else {
      res.json(data);
    }
  } catch (err) {
    next(err);
  }
}
