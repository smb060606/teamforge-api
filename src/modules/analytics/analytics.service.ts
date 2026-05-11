import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { getCacheKey, getFromCache, setInCache } from './cache.service';

// BUG #27: Prototype pollution in deepMerge — no __proto__ or constructor check
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

// BUG #36: Extensive use of `any` type — defeats TypeScript type safety
const DEFAULT_FILTERS: any = {
  includeArchived: false,
  minDeployments: 0,
  environments: ['STAGING', 'PRODUCTION'],
};

// BUG #36 continued: Function params and returns use `any`
export function parseFilters(queryParams: any): any {
  const filters = { ...DEFAULT_FILTERS };
  if (queryParams.filters) {
    // BUG #27: Vulnerable to prototype pollution
    // Request with ?filters[__proto__][isAdmin]=true would pollute Object.prototype
    return deepMerge(filters, queryParams.filters);
  }
  return filters;
}

// BUG #30: Division by zero when time range < 7 days
// Math.floor(daysDiff / 7) = 0, causing Infinity in JSON response
export async function calculateVelocity(
  projectId: string,
  startDate?: string,
  endDate?: string,
): Promise<any> {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // BUG #33: Cache key missing teamId/projectId — data leakage between teams
  const cacheKey = getCacheKey('velocity', start.toISOString(), end.toISOString());
  const cached = getFromCache(cacheKey);
  if (cached) {
    // BUG #37: console.log instead of structured logger
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

  // Division by zero when daysDiff < 7
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

// BUG #31: Change failure rate counts rollbacks in denominator
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

  const total = deployments.length; // Includes rollback deployments in count
  const failed = deployments.filter((d: any) => d.status === 'FAILED').length;

  // BUG: Rollback deployments inflate the denominator
  // With 8 deploys, 2 failures, 2 rollbacks: shows 2/12 (16.7%) instead of 2/8 (25%)
  const changeFailureRate = total > 0 ? (failed / total) * 100 : 0;

  return {
    total,
    failed,
    changeFailureRate,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

// BUG #32: Date range off by one day — exclusive end at midnight
export async function getMetricsForDateRange(
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<any> {
  // endDate is constructed from query param which defaults to midnight
  // Using `lt` (exclusive) means the entire last day is excluded
  const start = new Date(startDate);
  const end = new Date(endDate); // e.g., "2024-05-07" -> midnight, excluding May 7

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

  // BUG #38: Magic numbers without named constants
  const score = deploySuccessRate * 0.6 - severeIncidents * 0.1;
  const healthStatus = score > 0.85 ? 'healthy' :
                       score > 0.6 ? 'warning' : 'critical';

  // BUG #38 continued: More magic numbers
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

  // BUG #36: Results typed as `any`
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
