import { Router } from 'express';
import * as projectsController from './projects.controller';
import { authenticate } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validateRequest';
import { createProjectSchema, updateProjectSchema } from './projects.schema';

const router = Router();

router.get('/', authenticate, projectsController.listProjects);
router.get('/:id', authenticate, projectsController.getProject);
router.post('/', authenticate, validateRequest(createProjectSchema), projectsController.createProject);
router.put('/:id', authenticate, validateRequest(updateProjectSchema), projectsController.updateProject);
router.delete('/:id', authenticate, projectsController.deleteProject);

export default router;
