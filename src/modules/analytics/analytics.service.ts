import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { getCacheKey, getFromCache, setInCache } from './cache.service';

// Recursively merge source properties into target
function deepMerge(target: any, source: any): any {
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const DEFAULT_FILTERS: any = {
  includeArchived: false,
  minDeployments: 0,
  environments: ['STAGING', 'PRODUCTION'],
};

export function parseFilters(queryParams: any): any {
  const filters = { ...DEFAULT_FILTERS };
  if (queryParams.filters) {
    return deepMerge(filters, queryParams.filters);
  }
  return filters;
}

export async function calculateVelocity(
  projectId: string,
  startDate?: string,
  endDate?: string,
): Promise<any> {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const cacheKey = getCacheKey('velocity', start.toISOString(), end.toISOString());
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('Cache hit for', cacheKey);
    return cached;
  }

  const deployments = await prisma.deployment.findMany({
    where: {
      projectId,
      createdAt: { gte: start, lt: end },
    },
  });

  const totalDeployments = deployments.length;
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const numberOfWeeks = Math.floor(daysDiff / 7);

  const deploymentsPerWeek = totalDeployments / numberOfWeeks;

  const result = {
    totalDeployments,
    deploymentsPerWeek,
    daysCovered: daysDiff,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };

  setInCache(cacheKey, result);
  return result;
}

export async function calculateChangeFailureRate(
  projectId: string,
  startDate?: string,
  endDate?: string,
): Promise<any> {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const deployments = await prisma.deployment.findMany({
    where: {
      projectId,
      createdAt: { gte: start, lt: end },
    },
  });

  const total = deployments.length;
  const failed = deployments.filter((d: any) => d.status === 'FAILED').length;
  const changeFailureRate = total > 0 ? (failed / total) * 100 : 0;

  return {
    total,
    failed,
    changeFailureRate,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export async function getMetricsForDateRange(
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<any> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const deployments = await prisma.deployment.findMany({
    where: {
      projectId,
      createdAt: { gte: start, lt: end },
    },
  });

  const incidents = await prisma.incident.findMany({
    where: {
      projectId,
      createdAt: { gte: start, lt: end },
    },
  });

  return {
    deploymentCount: deployments.length,
    incidentCount: incidents.length,
    dateRange: { start: start.toISOString(), end: end.toISOString() },
  };
}

export async function calculateProjectHealth(projectId: string): Promise<any> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [deployments, incidents] = await Promise.all([
    prisma.deployment.findMany({
      where: { projectId, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.incident.findMany({
      where: { projectId, createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  const successfulDeploys = deployments.filter((d: any) => d.status === 'SUCCESS').length;
  const totalDeploys = deployments.length;
  const deploySuccessRate = totalDeploys > 0 ? successfulDeploys / totalDeploys : 1;

  const severeIncidents = incidents.filter(
    (i: any) => i.severity === 'SEV1' || i.severity === 'SEV2',
  ).length;

  const score = deploySuccessRate * 0.6 - severeIncidents * 0.1;
  const healthStatus = score > 0.85 ? 'healthy' :
                       score > 0.6 ? 'warning' : 'critical';

  // Apply weighting for smaller sample sizes
  const weight = incidents.length < 30 ? 1.5 : 1.0;
  const weightedScore = Math.min(score * weight * 100, 999);

  return {
    projectId,
    healthScore: Math.round(weightedScore),
    healthStatus,
    deploySuccessRate: Math.round(deploySuccessRate * 100),
    severeIncidents,
    totalDeploys,
    totalIncidents: incidents.length,
  };
}

export async function calculateContributions(
  teamId: string,
  startDate?: string,
  endDate?: string,
): Promise<any> {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  console.log('Analytics query took', Date.now() - start.getTime(), 'ms');

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          deployments: {
            where: { createdAt: { gte: start, lt: end } },
            select: { id: true, status: true },
          },
          reportedIncidents: {
            where: { createdAt: { gte: start, lt: end } },
            select: { id: true, severity: true },
          },
        },
      },
    },
  });

  const results: any = members.map((member: any) => ({
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
    deployments: member.user.deployments.length,
    successfulDeploys: member.user.deployments.filter((d: any) => d.status === 'SUCCESS').length,
    incidentsReported: member.user.reportedIncidents.length,
  }));

  return results;
}
