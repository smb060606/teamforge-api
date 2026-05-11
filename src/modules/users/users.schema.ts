import { z } from 'zod';

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  role: z.enum(['ADMIN', 'MANAGER', 'DEVELOPER', 'VIEWER']).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
