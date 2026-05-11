import { Router } from 'express';
import * as analyticsController from './analytics.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/authorize';
import { validateRequest } from '../../middleware/validateRequest';
import { exportSchema } from './analytics.schema';

const router = Router();

// Analytics endpoints — admin/manager only
router.get('/velocity', authenticate, authorize('ADMIN', 'MANAGER'), analyticsController.getVelocity);
router.get('/change-failure', authenticate, authorize('ADMIN', 'MANAGER'), analyticsController.getChangeFailureRate);
router.get('/health/:projectId', authenticate, analyticsController.getProjectHealth);
router.get('/contributions', authenticate, authorize('ADMIN', 'MANAGER'), analyticsController.getContributions);
router.get('/metrics', authenticate, analyticsController.getDateRangeMetrics);

// Export
router.post('/export', authenticate, authorize('ADMIN', 'MANAGER'), validateRequest(exportSchema), analyticsController.exportReport);

export default router;
