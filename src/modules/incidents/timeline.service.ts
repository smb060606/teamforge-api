import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors';

export async function getTimeline(incidentId: string) {
  const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
  if (!incident) {
    throw new NotFoundError('Incident', incidentId);
  }

  const entries = await prisma.incidentTimeline.findMany({
    where: { incidentId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return entries;
}

export async function getTimelineStats(incidentId: string) {
  const entries = await prisma.incidentTimeline.findMany({
    where: { incidentId },
  });

  const byType: Record<string, number> = {};
  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }

  return {
    totalEntries: entries.length,
    byType,
    firstEntry: entries[0]?.createdAt,
    lastEntry: entries[entries.length - 1]?.createdAt,
  };
}
