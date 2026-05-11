import { Router } from 'express';
import * as incidentsController from './incidents.controller';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import {
  createIncidentSchema,
  updateStatusSchema,
  assignIncidentSchema,
  addTimelineEntrySchema,
} from './incidents.schema';

const router = Router();

// Incident CRUD
router.get('/search', authenticate, incidentsController.searchIncidents);
router.get('/metrics', authenticate, incidentsController.getMetrics);
router.get('/escalations', authenticate, incidentsController.checkEscalations);
router.get('/', authenticate, incidentsController.listIncidents);
router.get('/:id', authenticate, incidentsController.getIncident);
router.post('/', authenticate, validateRequest(createIncidentSchema), incidentsController.createIncident);

// BUG #25: Missing validateRequest middleware on PUT route
// All other mutation routes use validation, but this one was "accidentally" omitted
router.put('/:id', authenticate, incidentsController.updateIncident);

// Status and assignment
router.put('/:id/status', authenticate, validateRequest(updateStatusSchema), incidentsController.updateStatus);
router.put('/:id/assign', authenticate, validateRequest(assignIncidentSchema), incidentsController.assignIncident);

// Timeline
router.get('/:id/timeline', authenticate, incidentsController.getTimeline);
router.post('/:id/timeline', authenticate, validateRequest(addTimelineEntrySchema), incidentsController.addTimelineEntry);

export default router;
