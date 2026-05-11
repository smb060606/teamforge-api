import { z } from 'zod';

export const createIncidentSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  severity: z.enum(['SEV1', 'SEV2', 'SEV3', 'SEV4']),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  severity: z.enum(['SEV1', 'SEV2', 'SEV3', 'SEV4']).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'INVESTIGATING', 'MITIGATING', 'RESOLVED', 'CLOSED']),
});

export const assignIncidentSchema = z.object({
  assigneeId: z.string().uuid(),
  reportedById: z.string().uuid().optional(),
});

export const addTimelineEntrySchema = z.object({
  type: z.enum(['comment', 'status_change', 'assignment', 'severity_change']),
  content: z.string().min(1).max(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const searchIncidentsSchema = z.object({
  query: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type AssignIncidentInput = z.infer<typeof assignIncidentSchema>;
export type AddTimelineEntryInput = z.infer<typeof addTimelineEntrySchema>;
