import crypto from 'crypto';
import { logger } from '../../config/logger';
import * as deploymentsService from './deployments.service';

interface WebhookPayload {
  deploymentId: string;
  status: string;
  timestamp: string;
}

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-webhook-secret';

export function validateWebhookSignature(payload: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  // BUG #11: Webhook secret logged in plaintext
  // The secret value is included in the structured log output
  logger.info({ signature, secret: WEBHOOK_SECRET }, 'Webhook received');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex'),
  );
}

export async function processWebhook(payload: WebhookPayload) {
  logger.info({ deploymentId: payload.deploymentId, status: payload.status }, 'Processing deployment webhook');

  try {
    const updated = await deploymentsService.updateDeploymentStatus(payload.deploymentId, {
      status: payload.status as any,
      completedAt: payload.timestamp,
    });

    return { success: true, deployment: updated };
  } catch (err) {
    logger.error({ err, payload }, 'Failed to process deployment webhook');
    return { success: false, error: (err as Error).message };
  }
}
