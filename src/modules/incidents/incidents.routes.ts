import { Router } from 'express';
import { authenticate } from '../../middleware/auth';

const router = Router();

// TODO: Implement incident management endpoints
// - POST /              Create an incident
// - GET /               List incidents (with search, filtering)
// - GET /:id            Get incident details with timeline
// - PUT /:id            Update incident
// - PUT /:id/status     Change incident status
// - PUT /:id/assign     Assign incident
// - POST /:id/timeline  Add timeline entry
// - GET /metrics        Get incident metrics (MTTR, count by severity)

router.get('/', authenticate, (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Incident management coming soon' } });
});

export default router;
