import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors';
import { PaginationParams } from '../../shared/types';
import { getPrismaSkipTake, buildPaginatedResponse } from '../../shared/pagination';
import { CreateIncidentInput, UpdateIncidentInput, AssignIncidentInput, AddTimelineEntryInput } from './incidents.schema';
import { logger } from '../../config/logger';

// BUG #17: State machine missing CLOSED key — transitioning from CLOSED
// will cause "Cannot read properties of undefined (reading 'includes')"
const STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['INVESTIGATING'],
  INVESTIGATING: ['MITIGATING', 'RESOLVED'],
  MITIGATING: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  // Missing: CLOSED: [] — causes crash when checking transitions for closed incidents
};

// BUG #13: No HTML sanitization — title and description stored directly from user input
// Any frontend consuming this API is vulnerable to stored XSS
export async function createIncident(userId: string, input: CreateIncidentInput) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) {
    throw new NotFoundError('Project', input.projectId);
  }

  const incident = await prisma.incident.create({
    data: {
      projectId: input.projectId,
      title: input.title,         // No sanitization
      description: input.description, // No sanitization — stored as-is
      severity: input.severity as any,
      reportedById: userId,
    },
    include: {
      project: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Create initial timeline entry
  await prisma.incidentTimeline.create({
    data: {
      incidentId: incident.id,
      userId,
      type: 'status_change',
      content: `Incident created with severity ${input.severity}`,
    },
  });

  logger.info({ incidentId: incident.id, severity: input.severity }, 'Incident created');

  return incident;
}

export async function getIncident(id: string) {
  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, slug: true } },
      reportedBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      timeline: {
        include: {
          user: { select: { id: true, name: true } },
        },
        // BUG #19: Missing orderBy — timeline entries returned in insertion order
        // which may not match createdAt order due to concurrent inserts
      },
    },
  });

  if (!incident) {
    throw new NotFoundError('Incident', id);
  }

  return incident;
}

export async function listIncidents(params: PaginationParams, projectId?: string, severity?: string, status?: string) {
  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (severity) where.severity = severity;
  if (status) where.status = status;

  const [incidents, total] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: { createdAt: params.sortOrder ?? 'desc' },
      ...getPrismaSkipTake(params),
    }),
    prisma.incident.count({ where }),
  ]);

  // BUG #23: N+1 — loops through each incident to fetch assignee
  // instead of using Prisma include
  const enrichedIncidents = [];
  for (const incident of incidents) {
    let assignee = null;
    if (incident.assignedToId) {
      assignee = await prisma.user.findUnique({
        where: { id: incident.assignedToId },
        select: { id: true, name: true, email: true, avatarUrl: true },
      });
    }
    enrichedIncidents.push({ ...incident, assignedTo: assignee });
  }

  return buildPaginatedResponse(enrichedIncidents, total, params);
}

export async function updateIncident(id: string, input: UpdateIncidentInput) {
  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) {
    throw new NotFoundError('Incident', id);
  }

  return prisma.incident.update({
    where: { id },
    data: input as any,
    include: {
      project: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
}

export async function updateIncidentStatus(id: string, userId: string, newStatus: string) {
  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) {
    throw new NotFoundError('Incident', id);
  }

  // BUG #17: Crashes when currentStatus is CLOSED because CLOSED is not in STATUS_TRANSITIONS
  const allowed = STATUS_TRANSITIONS[incident.status];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid status transition: ${incident.status} -> ${newStatus}`);
  }

  const data: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'RESOLVED') {
    data.resolvedAt = new Date();
  }

  const updated = await prisma.incident.update({
    where: { id },
    data: data as any,
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  // Add timeline entry for status change
  await prisma.incidentTimeline.create({
    data: {
      incidentId: id,
      userId,
      type: 'status_change',
      content: `Status changed from ${incident.status} to ${newStatus}`,
    },
  });

  logger.info({ incidentId: id, from: incident.status, to: newStatus }, 'Incident status updated');

  return updated;
}

// BUG #14: IDOR vulnerability — accepts assigneeId without verifying team membership
// Also takes reportedById from request body instead of JWT token
export async function assignIncident(id: string, input: AssignIncidentInput) {
  const incident = await prisma.incident.findUnique({ where: { id } });
  if (!incident) {
    throw new NotFoundError('Incident', id);
  }

  // Only validates that assigneeId is a valid UUID (done by schema)
  // Does NOT verify the assignee is a member of the project's team
  const assignee = await prisma.user.findUnique({ where: { id: input.assigneeId } });
  if (!assignee) {
    throw new NotFoundError('User', input.assigneeId);
  }

  const data: Record<string, unknown> = { assignedToId: input.assigneeId };

  // BUG #14 part 2: reportedById taken from body, not from auth token
  // Allows incident spoofing
  if (input.reportedById) {
    data.reportedById = input.reportedById;
  }

  const updated = await prisma.incident.update({
    where: { id },
    data: data as any,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  return updated;
}

export async function addTimelineEntry(incidentId: string, userId: string, input: AddTimelineEntryInput) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) {
    throw new NotFoundError('Incident', incidentId);
  }

  return prisma.incidentTimeline.create({
    data: {
      incidentId,
      userId,
      type: input.type,
      content: input.content,  // No sanitization — stored XSS vector
      metadata: input.metadata as any,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });
}

// BUG #20: Search returns duplicate results when matching on both title and timeline
// because the join on timeline without distinct produces duplicates
export async function searchIncidents(query?: string, severity?: string, status?: string, projectId?: string) {
  const where: Record<string, unknown> = {};
  if (severity) where.severity = severity;
  if (status) where.status = status;
  if (projectId) where.projectId = projectId;

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      {
        timeline: {
          some: {
            content: { contains: query, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  // No .distinct() — when an incident matches on both title AND a timeline entry,
  // it appears twice in results
  const incidents = await prisma.incident.findMany({
    where: where as any,
    include: {
      project: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      timeline: true,  // Eager loading all timeline entries
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return incidents;
}

// BUG #22: Loads ALL incidents with ALL timeline entries into memory
// Uses findMany + .length instead of count() and aggregate()
export async function getIncidentMetrics(projectId?: string) {
  const where = projectId ? { projectId } : {};

  const incidents = await prisma.incident.findMany({
    where,
    include: { timeline: true },
  });

  const total = incidents.length;
  const bySeverity: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalResolutionTimeMs = 0;
  let resolvedCount = 0;

  for (const incident of incidents) {
    bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
    byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;

    if (incident.resolvedAt) {
      totalResolutionTimeMs += incident.resolvedAt.getTime() - incident.createdAt.getTime();
      resolvedCount++;
    }
  }

  const mttrMinutes = resolvedCount > 0
    ? Math.round(totalResolutionTimeMs / resolvedCount / 60000)
    : 0;

  return {
    total,
    bySeverity,
    byStatus,
    mttrMinutes,
    resolvedCount,
  };
}
