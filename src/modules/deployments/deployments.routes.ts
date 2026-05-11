import { Router } from 'express';
import { authenticate } from '../../middleware/auth';

const router = Router();

// TODO: Implement deployment management endpoints
// - POST /         Create a new deployment
// - GET /          List deployments (with filtering by project, environment, status)
// - GET /:id       Get deployment details
// - PUT /:id/status  Update deployment status (webhook callback)
// - POST /:id/rollback  Rollback a deployment
// - GET /stats     Get deployment statistics

router.get('/', authenticate, (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Deployment management coming soon' } });
});

export default router;
