import { z } from 'zod';

export const createDeploymentSchema = z.object({
  projectId: z.string().uuid(),
  environment: z.enum(['DEVELOPMENT', 'STAGING', 'PRODUCTION']),
  commitSha: z.string().min(7).max(40).optional(),
  changelog: z.string().max(5000).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'ROLLED_BACK']),
  completedAt: z.string().datetime().optional(),
});

export const deploymentHistoryQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  environment: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
