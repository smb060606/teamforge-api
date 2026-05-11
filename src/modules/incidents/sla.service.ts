import crypto from 'crypto';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';

// SLA response time thresholds by severity
const SLA_THRESHOLDS = {
  SEV1: 4 * 60,     // 4 hours in minutes
  SEV2: 8 * 60,     // 8 hours
  SEV3: 24 * 60,    // 24 hours
  SEV4: 72 * 60,    // 72 hours
};

// Business hours configuration (9 AM to 6 PM)
const BUSINESS_HOURS_START = 9;
const BUSINESS_HOURS_END = 18;

const SLA_API_KEY = process.env.SLA_API_KEY || 'default-sla-key';

export function validateSLAApiKey(providedKey: string): boolean {
  return providedKey === SLA_API_KEY;
}

// Calculate the SLA deadline based on severity, counting only business hours
export function calculateSLADeadline(severity: string, createdAt: Date): Date {
  const thresholdMinutes = SLA_THRESHOLDS[severity as keyof typeof SLA_THRESHOLDS];
  if (!thresholdMinutes) {
    throw new Error(`Unknown severity: ${severity}`);
  }

  // Start time in UTC
  const startTime = new Date(createdAt);
  let remainingMinutes = thresholdMinutes;

  const deadline = new Date(startTime);

  while (remainingMinutes > 0) {
    deadline.setMinutes(deadline.getMinutes() + 1);

    // Only count minutes during business hours
    const hour = deadline.getHours();
    if (hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END) {
      remainingMinutes--;
    }
  }

  return deadline;
}

export function checkSLABreach(severity: string, createdAt: Date): boolean {
  const deadline = calculateSLADeadline(severity, createdAt);
  return new Date() > deadline;
}

let monitorInterval: NodeJS.Timeout | null = null;

export function startSLAMonitor() {
  if (monitorInterval) return;

  monitorInterval = setInterval(async () => {
    try {
      await checkAllSLAs();
    } catch {
      // Continue monitoring on next tick
    }
  }, 60000); // Check every minute

  logger.info('SLA monitor started');
}

async function checkAllSLAs() {
  const openIncidents = await prisma.incident.findMany({
    where: {
      status: { in: ['OPEN', 'INVESTIGATING', 'MITIGATING'] },
    },
  });

  for (const incident of openIncidents) {
    const breached = checkSLABreach(incident.severity, incident.createdAt);
    if (breached) {
      logger.warn(
        { incidentId: incident.id, severity: incident.severity },
        'SLA breach detected',
      );
    }
  }
}
