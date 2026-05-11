import { Router } from 'express';
import * as deploymentsController from './deployments.controller';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { createDeploymentSchema, updateStatusSchema } from './deployments.schema';

const router = Router();

// Deployment CRUD
router.get('/', authenticate, deploymentsController.listDeployments);
router.get('/history', authenticate, deploymentsController.getHistory);
router.get('/stats/:projectId', authenticate, deploymentsController.getStats);
router.get('/:id', authenticate, deploymentsController.getDeployment);
router.post('/', authenticate, validateRequest(createDeploymentSchema), deploymentsController.createDeployment);
router.put('/:id/status', authenticate, validateRequest(updateStatusSchema), deploymentsController.updateStatus);

// Rollback
router.post('/:id/rollback', authenticate, deploymentsController.rollbackDeployment);

export default router;
