import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { checkSLABreach } from './sla.service';

// Check high-severity incidents for SLA breaches and trigger escalations
export async function checkAndEscalate() {
  const threshold = new Date();
  threshold.setHours(threshold.getHours() - 1);

  const incidents = await prisma.incident.findMany({
    where: {
      severity: { in: ['SEV1', 'SEV2'] },
      createdAt: { lt: threshold },
    },
    include: {
      project: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  const escalations = [];

  for (const incident of incidents) {
    const breached = checkSLABreach(incident.severity, incident.createdAt);
    if (breached) {
      logger.warn(
        {
          incidentId: incident.id,
          severity: incident.severity,
          assignee: incident.assignedTo?.email,
        },
        'Escalation triggered for SLA breach',
      );

      escalations.push({
        incidentId: incident.id,
        severity: incident.severity,
        project: incident.project.name,
        assignee: incident.assignedTo?.email || 'unassigned',
        breachedAt: new Date().toISOString(),
      });
    }
  }

  return escalations;
}
