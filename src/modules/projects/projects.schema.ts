import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  teamId: z.string().uuid(),
  repositoryUrl: z.string().url().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'MAINTENANCE']).optional(),
  repositoryUrl: z.string().url().optional().nullable(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
