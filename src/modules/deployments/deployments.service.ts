import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors';
import { PaginationParams } from '../../shared/types';
import { getPrismaSkipTake, buildPaginatedResponse } from '../../shared/pagination';
import { CreateDeploymentInput, UpdateStatusInput } from './deployments.schema';
import { logger } from '../../config/logger';

// Valid status transitions for deployments
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_PROGRESS', 'FAILED'],
  IN_PROGRESS: ['SUCCESS', 'FAILED'],
  SUCCESS: ['ROLLED_BACK'],
  FAILED: [],
  ROLLED_BACK: [],
};

export async function createDeployment(userId: string, input: CreateDeploymentInput) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) {
    throw new NotFoundError('Project', input.projectId);
  }

  // Auto-increment version based on existing deployments for this project+environment
  const existingDeployments = await prisma.deployment.findMany({
    where: {
      projectId: input.projectId,
      environment: input.environment as any,
    },
  });

  // BUG #5: Off-by-one — uses length instead of length + 1
  // If there are 5 deployments, new one gets version "v5" (should be "v6")
  const nextVersion = `v${existingDeployments.length}`;

  const deployment = await prisma.deployment.create({
    data: {
      projectId: input.projectId,
      version: nextVersion,
      environment: input.environment as any,
      deployedById: userId,
      commitSha: input.commitSha,
      changelog: input.changelog,
    },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      deployedBy: { select: { id: true, name: true, email: true } },
    },
  });

  logger.info({ deploymentId: deployment.id, version: nextVersion }, 'Deployment created');

  return deployment;
}

export async function listDeployments(params: PaginationParams, projectId?: string) {
  const where = projectId ? { projectId } : {};

  const [deployments, total] = await Promise.all([
    prisma.deployment.findMany({
      where,
      orderBy: { createdAt: params.sortOrder ?? 'desc' },
      ...getPrismaSkipTake(params),
    }),
    prisma.deployment.count({ where }),
  ]);

  // BUG #8: N+1 query — loops through each deployment to fetch related data
  // instead of using Prisma's `include` in the original query
  const enrichedDeployments = [];
  for (const deployment of deployments) {
    const deployedBy = await prisma.user.findUnique({
      where: { id: deployment.deployedById },
      select: { id: true, name: true, email: true },
    });
    const project = await prisma.project.findUnique({
      where: { id: deployment.projectId },
      select: { id: true, name: true, slug: true },
    });
    enrichedDeployments.push({ ...deployment, deployedBy, project });
  }

  return buildPaginatedResponse(enrichedDeployments, total, params);
}

export async function getDeployment(id: string) {
  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      deployedBy: { select: { id: true, name: true, email: true } },
      rollbackOf: { select: { id: true, version: true, status: true } },
      rollbacks: { select: { id: true, version: true, status: true, createdAt: true } },
    },
  });

  if (!deployment) {
    throw new NotFoundError('Deployment', id);
  }

  return deployment;
}

export async function updateDeploymentStatus(id: string, input: UpdateStatusInput) {
  // BUG #4: Race condition — reads current status then updates in separate query
  // without a transaction. Two concurrent webhook callbacks can both read the same
  // status and both "succeed" in transitioning
  const deployment = await prisma.deployment.findUnique({ where: { id } });
  if (!deployment) {
    throw new NotFoundError('Deployment', id);
  }

  const allowed = VALID_TRANSITIONS[deployment.status];
  if (!allowed || !allowed.includes(input.status)) {
    throw new Error(`Invalid status transition: ${deployment.status} -> ${input.status}`);
  }

  // No transaction wrapping these operations
  const updated = await prisma.deployment.update({
    where: { id },
    data: {
      status: input.status as any,
      completedAt: input.completedAt ? new Date(input.completedAt) :
                   ['SUCCESS', 'FAILED'].includes(input.status) ? new Date() : undefined,
    },
    include: {
      project: { select: { id: true, name: true } },
      deployedBy: { select: { id: true, name: true } },
    },
  });

  logger.info({ deploymentId: id, from: deployment.status, to: input.status }, 'Deployment status updated');

  return updated;
}

export async function rollbackDeployment(id: string, userId: string) {
  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!deployment) {
    throw new NotFoundError('Deployment', id);
  }

  if (deployment.status !== 'SUCCESS') {
    throw new Error('Can only rollback successful deployments');
  }

  // BUG #6: Incorrect sort order — uses 'asc' instead of 'desc'
  // This selects the OLDEST successful deployment instead of the most recent one
  const previousSuccessful = await prisma.deployment.findFirst({
    where: {
      projectId: deployment.projectId,
      environment: deployment.environment,
      status: 'SUCCESS',
      id: { not: id },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!previousSuccessful) {
    throw new Error('No previous successful deployment to rollback to');
  }

  // Create a new deployment that represents the rollback
  const rollback = await prisma.deployment.create({
    data: {
      projectId: deployment.projectId,
      version: `${previousSuccessful.version}-rollback`,
      environment: deployment.environment,
      status: 'PENDING' as any,
      deployedById: userId,
      commitSha: previousSuccessful.commitSha,
      rollbackOfId: id,
    },
    include: {
      project: { select: { id: true, name: true } },
      deployedBy: { select: { id: true, name: true } },
      rollbackOf: { select: { id: true, version: true } },
    },
  });

  // Mark original deployment as rolled back
  await prisma.deployment.update({
    where: { id },
    data: { status: 'ROLLED_BACK' as any },
  });

  logger.info({ rollbackId: rollback.id, originalId: id }, 'Deployment rollback initiated');

  return rollback;
}

export async function getDeploymentStats(projectId: string) {
  // BUG #9: Unbounded query — fetches ALL deployments for the project into memory
  // instead of using aggregate queries. Will crash with large datasets
  const deployments = await prisma.deployment.findMany({
    where: { projectId },
  });

  type DeploymentRecord = typeof deployments[number];
  const total = deployments.length;
  const successful = deployments.filter((d: DeploymentRecord) => d.status === 'SUCCESS').length;
  const failed = deployments.filter((d: DeploymentRecord) => d.status === 'FAILED').length;
  const rolledBack = deployments.filter((d: DeploymentRecord) => d.status === 'ROLLED_BACK').length;
  const pending = deployments.filter((d: DeploymentRecord) => d.status === 'PENDING' || d.status === 'IN_PROGRESS').length;

  // Calculate average deployment time for successful deployments
  const completedDeployments = deployments.filter(
    (d: DeploymentRecord) => d.status === 'SUCCESS' && d.completedAt,
  );
  const avgDeployTimeMs = completedDeployments.length > 0
    ? completedDeployments.reduce((acc: number, d: DeploymentRecord) => {
        return acc + (d.completedAt!.getTime() - d.startedAt.getTime());
      }, 0) / completedDeployments.length
    : 0;

  return {
    total,
    successful,
    failed,
    rolledBack,
    pending,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    avgDeployTimeSeconds: Math.round(avgDeployTimeMs / 1000),
  };
}

export async function getDeploymentHistory(
  projectId: string,
  environment?: string,
  startDate?: string,
  endDate?: string,
) {
  // BUG #1: SQL injection — environment is interpolated directly into raw SQL
  // instead of using parameterized queries
  let query = `
    SELECT
      d.id,
      d.version,
      d.environment,
      d.status,
      d.commit_sha,
      d.started_at,
      d.completed_at,
      d.created_at,
      u.name as deployed_by_name,
      u.email as deployed_by_email,
      EXTRACT(EPOCH FROM (d.completed_at - d.started_at)) as deploy_duration_seconds
    FROM deployments d
    JOIN users u ON d.deployed_by_id = u.id
    WHERE d.project_id = '${projectId}'
  `;

  if (environment) {
    // Direct string interpolation — SQL injection vulnerability
    query += ` AND d.environment = '${environment}'`;
  }

  if (startDate) {
    query += ` AND d.created_at >= '${startDate}'`;
  }

  if (endDate) {
    query += ` AND d.created_at <= '${endDate}'`;
  }

  query += ` ORDER BY d.created_at DESC LIMIT 100`;

  const results = await prisma.$queryRawUnsafe(query);
  return results;
}
