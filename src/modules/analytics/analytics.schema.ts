import { z } from 'zod';

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  teamId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const exportSchema = z.object({
  reportType: z.enum(['velocity', 'health', 'contributions', 'change-failure']),
  format: z.enum(['csv', 'json']).default('csv'),
  callbackUrl: z.string().url().optional(),
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type ExportInput = z.infer<typeof exportSchema>;
